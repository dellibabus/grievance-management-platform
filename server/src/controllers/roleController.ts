import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { User } from "../entities/User";
import { AuthenticatedRequest } from "../types/express";
import { logAction } from "../services/auditLogService";

const isSuperAdmin = (role: string) => role === "super_admin";

// GET /api/roles
export const listRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({ order: { name: "ASC" } });

    return res.json({ success: true, roles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/roles
export const createRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const { name, permissions } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "_");

    const existing = await roleRepo.findOne({ where: { name: normalizedName } });
    if (existing) {
      return res.status(400).json({ success: false, message: "A role with this name already exists" });
    }

    const role = new Role();
    role.name = normalizedName;
    role.permissions = Array.isArray(permissions) ? permissions : [];

    const savedRole = await roleRepo.save(role);

    await logAction(req.user.id, "CREATE_ROLE", "roles", savedRole.id, { name: savedRole.name, permissions: savedRole.permissions }, req.ip || "127.0.0.1");

    return res.status(201).json({ success: true, message: "Role created successfully", role: savedRole });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/roles/:id
export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: "Permissions must be an array of permission names" });
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id } });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    role.permissions = permissions;
    const savedRole = await roleRepo.save(role);

    await logAction(req.user.id, "UPDATE_ROLE", "roles", savedRole.id, { name: savedRole.name, permissions: savedRole.permissions }, req.ip || "127.0.0.1");

    return res.json({ success: true, message: "Role updated successfully", role: savedRole });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/roles/:id
export const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const { id } = req.params;

    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id } });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (["super_admin", "state_admin", "district_admin", "volunteer"].includes(role.name)) {
      return res.status(400).json({ success: false, message: "Built-in roles cannot be deleted" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const assignedCount = await userRepo.count({ where: { role: { id: role.id } } });
    if (assignedCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete role: ${assignedCount} user(s) are assigned to it` });
    }

    await roleRepo.remove(role);

    await logAction(req.user.id, "DELETE_ROLE", "roles", id, { name: role.name }, req.ip || "127.0.0.1");

    return res.json({ success: true, message: "Role deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/roles/permissions
export const listPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const permRepo = AppDataSource.getRepository(Permission);
    const permissions = await permRepo.find({ order: { name: "ASC" } });

    return res.json({ success: true, permissions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/roles/permissions
export const createPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!isSuperAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Super administrators only." });
    }

    const { name, description } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Permission name is required" });
    }

    const permRepo = AppDataSource.getRepository(Permission);
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "_");

    const existing = await permRepo.findOne({ where: { name: normalizedName } });
    if (existing) {
      return res.status(400).json({ success: false, message: "A permission with this name already exists" });
    }

    const permission = new Permission();
    permission.name = normalizedName;
    permission.description = description || "";

    const savedPermission = await permRepo.save(permission);

    await logAction(req.user.id, "CREATE_PERMISSION", "permissions", savedPermission.id, { name: savedPermission.name }, req.ip || "127.0.0.1");

    return res.status(201).json({ success: true, message: "Permission created successfully", permission: savedPermission });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};