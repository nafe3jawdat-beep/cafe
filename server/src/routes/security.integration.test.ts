import crypto from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connectSocket, type Socket as ClientSocket } from "socket.io-client";
import express from "express";
import request, { type Response } from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/cafe_qr",
    JWT_SECRET: "integration-test-secret-that-is-long-enough",
    SESSION_TTL_HOURS: 12,
    CLIENT_ORIGIN: "http://localhost:5173",
    COOKIE_SECURE: false,
    REQUIRE_TABLE_KEY: true,
    TRUST_PROXY_HOPS: 1,
    CURRENCY: "USD",
    TAX_RATE: 0,
    SERVICE_CHARGE_RATE: 0,
    RATE_LIMIT_PER_IP: 60,
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    diningTable: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { SESSION_COOKIE, signSession } from "../lib/session";
import { createApp } from "../app";
import { EVENTS } from "../realtime/events";
import { createSocketServer } from "../realtime/socket";

const INITIAL_QR_TOKEN = "old-table-key";
const STAFF_USER = {
  id: "admin-id",
  name: "Test Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
  active: true,
};

let table: {
  id: string;
  number: number;
  name: string;
  active: boolean;
  qrToken: string;
};
let forwardedForCounter = 1;
const clients: ClientSocket[] = [];
const socketServers: Array<{
  io: ReturnType<typeof createSocketServer>;
  server: HttpServer;
}> = [];

function originAndIpHeaders() {
  forwardedForCounter += 1;
  return {
    Origin: env.CLIENT_ORIGIN,
    "X-Forwarded-For": `192.0.2.${forwardedForCounter}`,
  };
}

function publicRequest(app: express.Express, endpoint: string, key?: string) {
  const headers = originAndIpHeaders();
  const validKey = key ? { tableKey: key } : {};

  if (endpoint === "menu") {
    const query = key ? `?key=${encodeURIComponent(key)}` : "";
    return request(app)
      .get(`/api/public/tables/1/menu${query}`)
      .set(headers);
  }
  if (endpoint === "session") {
    const query = key ? `?key=${encodeURIComponent(key)}` : "";
    return request(app)
      .get(`/api/public/tables/1/session${query}`)
      .set(headers);
  }
  if (endpoint === "order") {
    return request(app)
      .post("/api/public/orders")
      .set(headers)
      .send({
        tableNumber: 1,
        ...validKey,
        clientRequestId: crypto.randomUUID(),
        items: [{ menuItemId: "item-id", quantity: 1 }],
      });
  }
  if (endpoint === "call") {
    return request(app)
      .post("/api/public/calls")
      .set(headers)
      .send({ tableNumber: 1, ...validKey, type: "WAITER" });
  }
  return request(app)
    .post("/api/public/bills")
    .set(headers)
    .send({ tableNumber: 1, ...validKey });
}

async function listenOnRandomPort(server: HttpServer) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function startSocketTestServer() {
  const server = createServer(createApp());
  const io = createSocketServer(server);
  const url = await listenOnRandomPort(server);
  socketServers.push({ io, server });
  const socket = connectSocket(url, { transports: ["websocket"] });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

beforeEach(() => {
  table = {
    id: "table-id",
    number: 1,
    name: "Window",
    active: true,
    qrToken: INITIAL_QR_TOKEN,
  };
  forwardedForCounter = 1;
  vi.clearAllMocks();
  vi.mocked(prisma.diningTable.findUnique).mockImplementation(
    () =>
      Promise.resolve(table) as unknown as ReturnType<
        typeof prisma.diningTable.findUnique
      >
  );
  vi.mocked(prisma.diningTable.update).mockImplementation((args) => {
    table = { ...table, ...args.data } as typeof table;
    return Promise.resolve(table) as unknown as ReturnType<
      typeof prisma.diningTable.update
    >;
  });
  vi.mocked(prisma.user.findUnique).mockResolvedValue(STAFF_USER as never);
});

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await Promise.all(
    socketServers.splice(0).map(
      ({ io }) =>
        new Promise<void>((resolve) => {
          io.close(() => resolve());
        })
    )
  );
});

describe("table-key and staff-key security integration", () => {
  it.each(["menu", "session", "order", "call", "bill"])(
    "rejects missing and wrong table keys for %s",
    async (endpoint) => {
      const app = createApp();
      const missingKeyResponse = await publicRequest(app, endpoint);
      const wrongKeyResponse = await publicRequest(app, endpoint, "wrong-key");

      expect(missingKeyResponse.status).toBe(403);
      expect(wrongKeyResponse.status).toBe(403);
    }
  );

  it.each([undefined, "wrong-key"])(
    "rejects a socket table:join with key %s",
    async (tableKey) => {
      const socket = await startSocketTestServer();
      const response = await new Promise<{ ok: boolean; error?: string }>(
        (resolve) => {
          socket.emit(
            EVENTS.TABLE_JOIN,
            { tableNumber: 1, tableKey },
            resolve
          );
        }
      );

      expect(response.ok).toBe(false);
    }
  );

  it("allows only an authenticated ADMIN to rotate a table key and rejects the old key", async () => {
    const app = createApp();
    const unauthenticated = await request(app)
      .post("/api/staff/tables/table-id/rotate-key")
      .set(originAndIpHeaders());
    expect(unauthenticated.status).toBe(401);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...STAFF_USER,
      role: "WAITER",
    } as never);
    const waiterToken = signSession({
      id: STAFF_USER.id,
      name: STAFF_USER.name,
      email: STAFF_USER.email,
      role: "WAITER",
    });
    const forbiddenRotation = await request(app)
      .post("/api/staff/tables/table-id/rotate-key")
      .set(originAndIpHeaders())
      .set("Cookie", `${SESSION_COOKIE}=${waiterToken}`);
    expect(forbiddenRotation.status).toBe(403);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(STAFF_USER as never);
    const token = signSession({
      id: STAFF_USER.id,
      name: STAFF_USER.name,
      email: STAFF_USER.email,
      role: "ADMIN",
    });
    const rotated = await request(app)
      .post("/api/staff/tables/table-id/rotate-key")
      .set(originAndIpHeaders())
      .set("Cookie", `${SESSION_COOKIE}=${token}`);

    expect(rotated.status).toBe(200);
    expect(rotated.body.qrToken).not.toBe(INITIAL_QR_TOKEN);
    expect(rotated.body.url).toContain(
      `/table/1?key=${rotated.body.qrToken}`
    );

    const oldKeyResponse = await request(app)
      .get("/api/public/tables/1/menu")
      .query({ key: INITIAL_QR_TOKEN });
    expect(oldKeyResponse.status).toBe(403);
  });

  it("enforces the per-IP order cap when tableNumber changes", async () => {
    const app = createApp();
    const ip = "198.51.100.240";
    let response: Response | undefined;

    for (let tableNumber = 1; tableNumber <= 61; tableNumber += 1) {
      response = await request(app)
        .post("/api/public/orders")
        .set({
          Origin: env.CLIENT_ORIGIN,
          "X-Forwarded-For": ip,
        })
        .send({
          tableNumber,
          clientRequestId: crypto.randomUUID(),
          items: [{ menuItemId: "item-id", quantity: 1 }],
        });
    }

    expect(response?.status).toBe(429);
    expect(response?.body.error.code).toBe("RATE_LIMITED");
  });
});
