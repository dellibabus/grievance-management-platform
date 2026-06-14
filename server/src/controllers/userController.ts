import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { District } from "../entities/District";
import { AuthenticatedRequest } from "../types/express";
import { logAction } from "../services/auditLogService";
import bcrypt from "bcrypt";

// GET /api/users (Admin only)
export const listUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;

    const userRepo = AppDataSource.getRepository(User);
    const qb = userRepo.createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.district", "district")
      .select([
        "user.id",
        "user.name",
        "user.email",
        "user.phone",
        "user.is_active",
        "user.created_at",
        "role.id",
        "role.name",
        "district.id",
        "district.name"
      ]);

    // Apply visibility scoping based on role
    if (role === "district_admin") {
      qb.andWhere("user.district_id = :distId", { distId: districtId });
    }

    qb.orderBy("user.created_at", "DESC");
    const users = await qb.getMany();

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users (super_admin only)
export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone, roleName, districtId } = req.body;

    if (!name || !email || !password || !phone || !roleName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const districtRepo = AppDataSource.getRepository(District);

    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User email already exists" });
    }

    const role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ success: false, message: "Specified role does not exist" });
    }

    let district = null;
    if (districtId) {
      district = await districtRepo.findOne({ where: { id: districtId } });
      if (!district) {
        return res.status(400).json({ success: false, message: "Specified district not found" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User();
    user.name = name;
    user.email = email;
    user.password = hashedPassword;
    user.phone = phone;
    user.role = role;
    user.district = district;
    user.is_active = true;

    const savedUser = await userRepo.save(user);

    // Audit Log
    await logAction(
      req.user!.id,
      "CREATE_USER",
      "users",
      savedUser.id,
      { email: savedUser.email, role: roleName },
      req.ip || "127.0.0.1"
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
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

// PUT /api/users/:id
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { name, phone, password, is_active, roleName, districtId } = req.body;
    const { role: actorRole, districtId: actorDistrictId } = req.user;

    const userRepo = AppDataSource.getRepository(User);
    const targetUser = await userRepo.findOne({
      where: { id },
      relations: ["role", "district"]
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // RBAC validation checks
    if (actorRole === "district_admin") {
      // District admins can only update users within their own district
      if (!targetUser.district || targetUser.district.id !== actorDistrictId) {
        return res.status(403).json({ success: false, message: "Forbidden: User does not belong to your district" });
      }

      // District admins cannot update roles or toggle active status of other administrators
      if (roleName && roleName !== targetUser.role.name) {
        return res.status(403).json({ success: false, message: "Forbidden: District admins cannot change user roles" });
      }
    }

    if (name) targetUser.name = name;
    if (phone) targetUser.phone = phone;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      targetUser.password = await bcrypt.hash(password, salt);
    }

    if (is_active !== undefined) {
      // Make sure a user doesn't deactivate themselves
      if (targetUser.id === req.user.id && !is_active) {
        return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
      }
      targetUser.is_active = is_active;
    }

    // Role and district changes restricted to super_admin or state_admin
    if (actorRole === "super_admin" || actorRole === "state_admin") {
      if (roleName) {
        const roleRepo = AppDataSource.getRepository(Role);
        const role = await roleRepo.findOne({ where: { name: roleName } });
        if (!role) {
          return res.status(400).json({ success: false, message: `Role '${roleName}' not found` });
        }
        targetUser.role = role;
      }

      if (districtId !== undefined) {
        if (districtId === null || districtId === "") {
          targetUser.district = null;
        } else {
          const distRepo = AppDataSource.getRepository(District);
          const district = await distRepo.findOne({ where: { id: districtId } });
          if (!district) {
            return res.status(400).json({ success: false, message: "District not found" });
          }
          targetUser.district = district;
        }
      }
    }

    const savedUser = await userRepo.save(targetUser);

    // Audit Log
    await logAction(
      req.user.id,
      "UPDATE_USER",
      "users",
      savedUser.id,
      { email: savedUser.email, is_active: savedUser.is_active },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        is_active: savedUser.is_active,
        role: savedUser.role.name,
        district: savedUser.district ? savedUser.district.name : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/users/:id (super_admin only)
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const targetUser = await userRepo.findOne({ where: { id } });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await userRepo.remove(targetUser);

    // Audit Log
    await logAction(
      req.user!.id,
      "DELETE_USER",
      "users",
      id,
      { email: targetUser.email },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
