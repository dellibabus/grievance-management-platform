import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, UserSessionPayload } from "../types/express";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_access_token_key_123456";

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Access token is missing or invalid" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSessionPayload;
    req.user = decoded;
    return next();
  } catch (error: unknown) {
    return res.status(401).json({ success: false, message: "Access token has expired or is invalid" });
  }
};

export const optionalAuthenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserSessionPayload;
      req.user = decoded;
    } catch (error: unknown) {
      // Fallback silently if token is expired or malformed for optional auth
    }
  }
  return next();
};
