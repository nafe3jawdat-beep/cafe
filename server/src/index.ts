import { createServer } from "node:http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { createSocketServer } from "./realtime/socket";
import { createApp } from "./app";

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

app.set("io", io);

httpServer.listen(env.PORT, () => {
  console.log(`[api] Cafe QR API listening on http://localhost:${env.PORT}`);
  console.log(`[api] Environment: ${env.NODE_ENV}`);
});

async function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received. Shutting down...`);
  io.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[api] Unhandled rejection:", reason);
});
