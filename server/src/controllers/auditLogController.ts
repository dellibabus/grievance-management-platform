import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { AuditLog } from "../entities/AuditLog";
import { AuthenticatedRequest } from "../types/express";

const canViewAuditLogs = (role: string) => role === "super_admin" || role === "state_admin";

// GET /api/audit-logs
export const listAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!canViewAuditLogs(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. State-level administrators only." });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const { action, entity, search } = req.query;

    const repo = AppDataSource.getRepository(AuditLog);
    const qb = repo.createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .orderBy("log.created_at", "DESC");

    if (action) {
      qb.andWhere("log.action = :action", { action });
    }

    if (entity) {
      qb.andWhere("log.entity = :entity", { entity });
    }

    if (search) {
      qb.andWhere("(user.name ILIKE :search OR user.email ILIKE :search OR CAST(log.entity_id AS TEXT) ILIKE :search)", {
        search: `%${search}%`
      });
    }

    const [logs, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const sanitized = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entity_id: log.entity_id,
      meta: log.meta,
      ip_address: log.ip_address,
      created_at: log.created_at,
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null
    }));

    return res.json({
      success: true,
      logs: sanitized,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

// GET /api/audit-logs/meta - distinct action/entity values for filter dropdowns
export const getAuditLogMeta = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!canViewAuditLogs(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied. State-level administrators only." });
    }

    const repo = AppDataSource.getRepository(AuditLog);
    const actionsRaw = await repo.createQueryBuilder("log").select("DISTINCT log.action", "action").orderBy("log.action", "ASC").getRawMany();
    const entitiesRaw = await repo.createQueryBuilder("log").select("DISTINCT log.entity", "entity").orderBy("log.entity", "ASC").getRawMany();

    return res.json({
      success: true,
      actions: actionsRaw.map((r) => r.action),
      entities: entitiesRaw.map((r) => r.entity)
    });
  } catch (error) {
    console.error("Failed to fetch audit log metadata:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit log metadata" });
  }
};
