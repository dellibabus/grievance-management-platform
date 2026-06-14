import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { Complaint } from "../entities/Complaint";
import { Category } from "../entities/Category";
import { Assignment } from "../entities/Assignment";
import { ComplaintUpdate } from "../entities/ComplaintUpdate";
import { Attachment } from "../entities/Attachment";
import { Notification } from "../entities/Notification";
import { AuditLog } from "../entities/AuditLog";
import { RefreshToken } from "../entities/RefreshToken";
import { District } from "../entities/District";
import { Mandal } from "../entities/Mandal";
import { Village } from "../entities/Village";
import dotenv from "dotenv";

dotenv.config();

const isDev = process.env.NODE_ENV === "development";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/grievance_db",
  ssl: process.env.DATABASE_URL?.includes("render.com") ? { rejectUnauthorized: false } : false,
  synchronize: true, // Automatically synchronize schema in development
  logging: isDev ? ["query", "error"] : ["error"],
  entities: [
    User,
    Role,
    Permission,
    Complaint,
    Category,
    Assignment,
    ComplaintUpdate,
    Attachment,
    Notification,
    AuditLog,
    RefreshToken,
    District,
    Mandal,
    Village
  ],
  migrations: [],
  subscribers: [],
});
