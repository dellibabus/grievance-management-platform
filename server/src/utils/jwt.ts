import jwt from "jsonwebtoken";
import { UserSessionPayload } from "../types/express";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_access_token_key_123456";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super_secret_refresh_token_key_123456";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

export const signAccessToken = (payload: UserSessionPayload): string => {
  return jwt.sign({ ...payload }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const signRefreshToken = (payload: { id: string }): string => {
  const expiry = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: expiry as any });
};

export const verifyRefreshToken = (token: string): { id: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
};
