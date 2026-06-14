import { AppDataSource } from "../config/data-source";
import { AuditLog } from "../entities/AuditLog";
import { User } from "../entities/User";

export const logAction = async (
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null = null,
  meta: Record<string, unknown> | null = null,
  ipAddress: string | null = null
): Promise<void> => {
  try {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    const log = new AuditLog();

    if (userId) {
      const user = new User();
      user.id = userId;
      log.user = user;
    } else {
      log.user = null;
    }

    log.action = action;
    log.entity = entity;
    log.entity_id = entityId;
    log.meta = meta;
    log.ip_address = ipAddress;

    await auditRepo.save(log);
  } catch (error: unknown) {
    console.error("Failed to write audit log:", error);
  }
};
