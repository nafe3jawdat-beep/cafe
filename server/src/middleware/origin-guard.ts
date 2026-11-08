import type { RequestHandler } from "express";
import { env } from "../config/env";
import { forbidden } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const GUARDED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function createOriginGuard(config: {
  NODE_ENV: string;
  CLIENT_ORIGIN: string;
}): RequestHandler {
  const allowedOrigins = new Set(
    [
      config.CLIENT_ORIGIN,
      "https://cafe-q.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ]
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value))
  );

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method) || !GUARDED_METHODS.has(req.method)) {
      return next();
    }

    if (config.NODE_ENV === "development") return next();

    const requestOrigin = normalizeOrigin(req.get("origin"));
    if (requestOrigin) {
      if (!allowedOrigins.has(requestOrigin)) {
        return next(forbidden("Request origin is not allowed."));
      }
      return next();
    }

    const refererOrigin = normalizeOrigin(req.get("referer"));
    if (!refererOrigin || !allowedOrigins.has(refererOrigin)) {
      return next(forbidden("Request origin is not allowed."));
    }

    next();
  };
}

export const originGuard: RequestHandler = createOriginGuard(env);