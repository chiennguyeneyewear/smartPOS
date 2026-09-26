import jwt from "jsonwebtoken";
import { config } from "./config.js";

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  permissions: string[];
  branchIds: string[];
  dv: string;
  ce: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, session: { dv: string; ce: number }): string {
  return jwt.sign({ sub: userId, ...session }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string; dv?: string; ce?: number } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; dv?: string; ce?: number };
}
