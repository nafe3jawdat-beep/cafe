import type { Role } from "@prisma/client";
import type { Request } from "express";

export const SESSION_COOKIE = "cafe_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SessionPayload extends SessionUser {
  iat?: number;
  exp?: number;
}

export type AuthenticatedRequest = Request & { staff: SessionUser };
