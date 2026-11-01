import jwt, { type SignOptions } from "jsonwebtoken";
import type { CookieOptions } from "express";
import { env } from "../config/env";
import { unauthorized } from "../lib/errors";
import { SESSION_COOKIE, type SessionPayload, type SessionUser } from "../types/auth";

export { SESSION_COOKIE };

const expiresIn = `${env.SESSION_TTL_HOURS}h` as SignOptions["expiresIn"];

export function signSession(user: SessionUser): string {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn }
  );
}

export function verifySession(token: string): SessionPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error("Invalid token payload");
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role as SessionUser["role"],
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    throw unauthorized("Your session has expired. Please sign in again.");
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // Lax supports normal top-level navigation while blocking most cross-site cookie sends.
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  };
}

export function readTokenFromRequest(req: {
  cookies?: Record<string, string>;
  headers: { authorization?: string };
}): string | null {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return null;
}
