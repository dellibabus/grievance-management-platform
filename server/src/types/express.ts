import { Request } from "express";

export interface UserSessionPayload {
  id: string;
  email: string;
  role: "super_admin" | "state_admin" | "district_admin" | "volunteer";
  permissions: string[];
  districtId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload;
}
