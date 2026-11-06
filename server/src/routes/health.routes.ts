import { Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * A database that is unreachable (for example after a Neon wake-up failure)
 * can leave a Prisma call hanging for a long time. Health checks must answer
 * quickly, so every probe is bounded.
 */
const DB_PROBE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Database probe timed out after ${ms}ms.`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

const router = Router();

// Cheap liveness check used by the platform and by uptime monitors.
// It intentionally does not touch the database.
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "cafe-qr-api",
    time: new Date().toISOString(),
  });
});

// Readiness check that proves the API can actually query Postgres.
// Only aggregate counts are exposed: this route is public.
router.get("/db", async (_req, res) => {
  const startedAt = Date.now();

  try {
    const counts = await withTimeout(
      (async () => {
        await prisma.$queryRaw`SELECT 1`;

        const [tables, menuItems, openOrders] = await Promise.all([
          prisma.diningTable.count(),
          prisma.menuItem.count(),
          prisma.order.count({
            where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
          }),
        ]);

        return { tables, menuItems, openOrders };
      })(),
      DB_PROBE_TIMEOUT_MS
    );

    res.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - startedAt,
      counts,
      time: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;

    // Keep connection details (host, port, credentials) out of the public
    // response; the full Prisma message goes to the platform logs.
    console.error(`[health] Database probe failed: ${message}`);

    res.status(503).json({
      status: "degraded",
      db: "down",
      latencyMs: Date.now() - startedAt,
      ...(code ? { code } : {}),
      message: "Database probe failed. Check the server logs for the Prisma error.",
      time: new Date().toISOString(),
    });
  }
});

export default router;
