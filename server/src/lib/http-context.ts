import type { Request } from "express";
import type { Server } from "socket.io";
import type { SessionUser } from "../types/auth";

export function getSocketServer(req: Request): Server {
  return req.app.get("io") as Server;
}

export function staffSession(req: Request): SessionUser {
  if (!req.staff) {
    throw new Error("staffSession called without requireAuth");
  }
  return req.staff;
}
