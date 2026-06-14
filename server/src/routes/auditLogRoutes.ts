import { Router } from "express";
import { listAuditLogs, getAuditLogMeta } from "../controllers/auditLogController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// GET /api/audit-logs (super_admin / state_admin only - enforced in controller)
router.get("/", authenticate, listAuditLogs);

// GET /api/audit-logs/meta - distinct action/entity values for filter dropdowns
router.get("/meta", authenticate, getAuditLogMeta);

export default router;
