import type { Server as HttpServer } from "node:http";
import { parse as parseCookie } from "cookie";
import { Server } from "socket.io";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { verifySession, SESSION_COOKIE } from "../lib/session";
import { getTableByNumber } from "../services/table.service";
import {
  EVENTS,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "./events";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
    maxHttpBufferSize: 1e5,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next();

    const cookies = parseCookie(rawCookie);
    const token = cookies[SESSION_COOKIE];
    if (!token) return next();

    try {
      const session = verifySession(token);
      // Re-check the database so a deactivated account cannot keep listening
      // to live orders with an otherwise valid session cookie.
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      });

      if (user?.active && user.role === "ADMIN") {
        socket.data.staff = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    } catch {
      // A stale cookie should not prevent guests from joining a table room.
    }

    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.staff) {
      void socket.join("staff");
    }

    socket.on(EVENTS.TABLE_JOIN, async (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload.tableNumber !== "number" ||
          !Number.isInteger(payload.tableNumber)
        ) {
          callback?.({ ok: false, error: "Invalid table." });
          return;
        }

        const table = await getTableByNumber(
          payload.tableNumber,
          payload.tableKey
        );

        if (socket.data.tableId) {
          await socket.leave(`table:${socket.data.tableId}`);
        }

        await socket.join(`table:${table.id}`);
        socket.data.tableId = table.id;
        socket.data.tableNumber = table.number;
        callback?.({ ok: true });
      } catch (error) {
        callback?.({
          ok: false,
          error:
            error instanceof Error ? error.message : "Could not join table.",
        });
      }
    });

    socket.on(EVENTS.STAFF_JOIN, (callback) => {
      if (!socket.data.staff || socket.data.staff.role !== "ADMIN") {
        callback?.({ ok: false, error: "Admin authentication required." });
        return;
      }

      void socket.join("staff");
      callback?.({ ok: true });
    });
  });

  return io;
}
