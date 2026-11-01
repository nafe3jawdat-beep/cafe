import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env";

export function getRateLimitKey(req: Pick<Request, "body" | "ip">) {
  const candidate = req.body?.tableNumber;
  const parsedNumber =
    typeof candidate === "number"
      ? candidate
      : typeof candidate === "string"
        ? Number(candidate)
        : Number.NaN;

  const ipKey = ipKeyGenerator(req.ip ?? "unknown");

  if (Number.isInteger(parsedNumber) && parsedNumber > 0) {
    return `${ipKey}:table:${parsedNumber}`;
  }

  return `${ipKey}:ip`;
}

const tableKeyGenerator = (req: Request) => getRateLimitKey(req);
const ipKeyGeneratorForLimiter = (req: Request) =>
  ipKeyGenerator(req.ip ?? "unknown");

const jsonLimitHandler = (message: string) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: "RATE_LIMITED", message },
      });
    },
  });

export const publicLimiter = jsonLimitHandler(
  "Too many requests. Please wait a moment and try again."
);

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: tableKeyGenerator,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many orders in a short time. Please wait a minute.",
      },
    });
  },
});

export const orderIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_PER_IP,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorForLimiter,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many orders from this IP. Please wait a minute.",
      },
    });
  },
});

export const serviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: tableKeyGenerator,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many service requests. A staff member has been notified.",
      },
    });
  },
});

export const serviceIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_PER_IP,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorForLimiter,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many service requests from this IP. Please wait a minute.",
      },
    });
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many sign-in attempts. Please try again in 15 minutes.",
      },
    });
  },
});
