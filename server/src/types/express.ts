import { Request } from "express";

export interface UserSessionPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  districtId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload;
}
