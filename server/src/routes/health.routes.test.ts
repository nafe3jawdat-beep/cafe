import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    diningTable: { count: vi.fn() },
    menuItem: { count: vi.fn() },
    order: { count: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma";
import healthRoutes from "./health.routes";

const app = express();
app.use("/api/health", healthRoutes);

const queryRaw = vi.mocked(prisma.$queryRaw);

describe("health routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.diningTable.count).mockResolvedValue(4);
    vi.mocked(prisma.menuItem.count).mockResolvedValue(12);
    vi.mocked(prisma.order.count).mockResolvedValue(3);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the liveness endpoint free of database calls", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("cafe-qr-api");
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("reports aggregate counts when the database answers", async () => {
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await request(app).get("/api/health/db");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      db: "up",
      counts: { tables: 4, menuItems: 12, openOrders: 3 },
    });
  });

  it("returns 503 when the database probe fails", async () => {
    const failure = new Error(
      "P1001: Can't reach database server at ep-example.neon.tech:5432"
    ) as Error & { code: string };
    failure.code = "P1001";
    queryRaw.mockRejectedValueOnce(failure);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/health/db");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: "degraded",
      db: "down",
      code: "P1001",
    });
    expect(response.body.message).not.toContain("neon.tech");
    expect(consoleError).toHaveBeenCalled();
  });
});
