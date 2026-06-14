import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/express";

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, permissions } = req.user;

    // Super Admin has master bypass authority
    if (role === "super_admin") {
      return next();
    }

    const hasPermission = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires permissions: ${requiredPermissions.join(", ")}`
      });
    }

    next();
  };
};
