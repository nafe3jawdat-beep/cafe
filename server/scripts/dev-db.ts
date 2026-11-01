import path from "node:path";

const databaseDir = path.resolve(process.cwd(), "data", "pg");
const port = Number(process.env.PGPORT ?? 5432);

let pg: { stop(): Promise<void> } | undefined;

async function main() {
  const { default: EmbeddedPostgresConstructor } = await import(
    "embedded-postgres"
  );
  const database = new EmbeddedPostgresConstructor({
    databaseDir,
    user: "cafe",
    password: "cafe_dev_password",
    port,
    persistent: true,
    // Windows clusters otherwise inherit the host ANSI code page (for example
    // WIN1252), which cannot store all menu text and rejects UTF-8 migrations.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  pg = database;

  console.log(`[dev-db] Starting embedded PostgreSQL on port ${port}...`);

  try {
    await database.initialise();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists|not empty|directory/i.test(message)) throw error;
    console.log("[dev-db] Existing cluster found, reusing it.");
  }

  await database.start();

  try {
    await database.createDatabase("cafe_qr");
    console.log("[dev-db] Created database cafe_qr.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
    console.log("[dev-db] Database cafe_qr already exists.");
  }

  console.log(
    `[dev-db] Ready: postgresql://cafe:cafe_dev_password@localhost:${port}/cafe_qr?schema=public`
  );
  console.log("[dev-db] Press Ctrl+C to stop.");
}

async function shutdown() {
  console.log("\n[dev-db] Stopping PostgreSQL...");
  await pg?.stop().catch(() => undefined);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (error) => {
  console.error("[dev-db] Failed to start:", error);
  await pg?.stop().catch(() => undefined);
  process.exit(1);
});
