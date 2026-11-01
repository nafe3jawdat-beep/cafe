import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { forbidden, unauthorized } from "../lib/errors";
import { readTokenFromRequest, verifySession } from "../lib/session";
import { asyncHandler } from "../lib/async-handler";

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readTokenFromRequest(req);
  if (!token) throw unauthorized();

  const payload = verifySession(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (!user || !user.active) {
    throw unauthorized("This staff account is no longer active.");
  }

  req.staff = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  next();
});

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.staff) return next(unauthorized());
    if (!roles.includes(req.staff.role)) {
      return next(forbidden("Your role cannot perform this action."));
    }
    next();
  };
