import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { District } from "../entities/District";
import { RefreshToken } from "../entities/RefreshToken";
import { AuthenticatedRequest, UserSessionPayload } from "../types/express";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { logAction } from "../services/auditLogService";
import bcrypt from "bcrypt";

// POST /api/auth/register
export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone, roleName, districtId } = req.body;

    if (!name || !email || !password || !phone || !roleName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const districtRepo = AppDataSource.getRepository(District);

    // Verify user doesn't already exist
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    // Verify role exists
    const role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ success: false, message: `Role '${roleName}' not found` });
    }

    // Verify district if provided
    let district = null;
    if (districtId) {
      district = await districtRepo.findOne({ where: { id: districtId } });
      if (!district) {
        return res.status(400).json({ success: false, message: "District not found" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User();
    newUser.name = name;
    newUser.email = email;
    newUser.password = hashedPassword;
    newUser.phone = phone;
    newUser.role = role;
    newUser.district = district;
    newUser.is_active = true;

    const savedUser = await userRepo.save(newUser);

    // Audit Log
    const creatorId = req.user ? req.user.id : null;
    await logAction(
      creatorId,
      "REGISTER_USER",
      "users",
      savedUser.id,
      { email: savedUser.email, role: roleName },
      req.ip || "127.0.0.1"
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role.name,
        district: savedUser.district ? savedUser.district.name : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { email },
      relations: ["role", "district"]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "User account is suspended" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate Access Token
    const payload: UserSessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
      districtId: user.district ? user.district.id : null
    };
    const accessToken = signAccessToken(payload);

    // Generate Refresh Token
    const rawRefreshToken = signRefreshToken({ id: user.id });

    // Save Refresh Token to Database
    const refreshRepo = AppDataSource.getRepository(RefreshToken);
    const refreshTokenRecord = new RefreshToken();
    refreshTokenRecord.user = user;
    refreshTokenRecord.token = rawRefreshToken;
    // Set expiry to 7 days
    refreshTokenRecord.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    refreshTokenRecord.is_revoked = false;
    await refreshRepo.save(refreshTokenRecord);

    // Set HTTPOnly cookie
    res.cookie("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Audit Log
    await logAction(
      user.id,
      "LOGIN",
      "users",
      user.id,
      { email: user.email },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        permissions: user.role.permissions,
        district: user.district ? { id: user.district.id, name: user.district.name } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/refresh
export const refresh = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token is missing" });
    }

    // Verify token structure
    try {
      verifyRefreshToken(rawRefreshToken);
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const refreshRepo = AppDataSource.getRepository(RefreshToken);
    const tokenRecord = await refreshRepo.findOne({
      where: { token: rawRefreshToken },
      relations: ["user", "user.role", "user.district"]
    });

    if (!tokenRecord || tokenRecord.is_revoked || tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = tokenRecord.user;
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "User account is suspended" });
    }

    // Generate New Access Token
    const payload: UserSessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions,
      districtId: user.district ? user.district.id : null
    };
    const accessToken = signAccessToken(payload);

    return res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    if (rawRefreshToken) {
      const refreshRepo = AppDataSource.getRepository(RefreshToken);
      const tokenRecord = await refreshRepo.findOne({ where: { token: rawRefreshToken } });
      if (tokenRecord) {
        tokenRecord.is_revoked = true;
        await refreshRepo.save(tokenRecord);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    if (req.user) {
      await logAction(
        req.user.id,
        "LOGOUT",
        "users",
        req.user.id,
        null,
        req.ip || "127.0.0.1"
      );
    }

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me
export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.user.id },
      relations: ["role", "district"]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        permissions: user.role.permissions,
        district: user.district ? { id: user.district.id, name: user.district.name } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
