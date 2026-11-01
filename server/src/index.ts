import { createServer } from "node:http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { createSocketServer } from "./realtime/socket";
import { createApp } from "./app";

const app = createApp();
const httpServer = createServer(app);
let io: ReturnType<typeof createSocketServer> | undefined;

async function start() {
  try {
    await prisma.$connect();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(
      "[api] Database connection failed. Check database availability and the configured DATABASE_URL."
    );
    console.error(`[api] Prisma startup error: ${errorName}`);
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      const disconnectErrorName =
        disconnectError instanceof Error
          ? disconnectError.name
          : "UnknownError";
      console.error(
        `[api] Prisma disconnect after startup failure also failed: ${disconnectErrorName}`
      );
    }
    process.exitCode = 1;
    return;
  }

  io = createSocketServer(httpServer);
  app.set("io", io);

  httpServer.once("error", (error) => {
    console.error(`[api] Failed to listen on 0.0.0.0:${env.PORT}: ${error.message}`);
    io?.close();
    void prisma
      .$disconnect()
      .catch(() => {
        console.error("[api] Prisma disconnect failed after listen error.");
      })
      .finally(() => {
        process.exitCode = 1;
      });
  });

  httpServer.listen(env.PORT, "0.0.0.0", () => {
    console.log(`[api] Cafe QR API listening on 0.0.0.0:${env.PORT}`);
    console.log(`[api] Environment: ${env.NODE_ENV}`);
  });
}

void start().catch(async (error: unknown) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`[api] Startup failed: ${errorName}`);
  io?.close();
  try {
    await prisma.$disconnect();
  } catch {
    console.error("[api] Prisma disconnect failed after startup error.");
  }
  process.exitCode = 1;
});

async function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received. Shutting down...`);
  io?.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  const errorName = reason instanceof Error ? reason.name : "UnknownError";
  console.error(`[api] Unhandled rejection: ${errorName}`);
});
