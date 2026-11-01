import type { RequestHandler } from "express";
import { env } from "../config/env";
import { forbidden } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const GUARDED_METHODS = new Set(["POST", "PATCH", "DELETE"]);

export function createOriginGuard(config: {
  NODE_ENV: string;
  CLIENT_ORIGIN: string;
}): RequestHandler {
  const clientOrigin = new URL(config.CLIENT_ORIGIN).origin;

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method) || !GUARDED_METHODS.has(req.method)) {
      return next();
    }

    if (config.NODE_ENV === "development") return next();

    const origin = req.get("origin");
    if (origin) {
      let requestOrigin: string;
      try {
        requestOrigin = new URL(origin).origin;
      } catch {
        return next(forbidden("Request origin is not allowed."));
      }

      if (requestOrigin !== clientOrigin) {
        return next(forbidden("Request origin is not allowed."));
      }
      return next();
    }

    const referer = req.get("referer");
    let refererOrigin: string | undefined;
    try {
      refererOrigin = referer ? new URL(referer).origin : undefined;
    } catch {
      refererOrigin = undefined;
    }

    if (refererOrigin !== clientOrigin) {
      return next(forbidden("Request origin is not allowed."));
    }

    next();
  };
}

export const originGuard: RequestHandler = createOriginGuard(env);