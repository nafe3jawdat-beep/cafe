import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env";

const prisma = new PrismaClient();

async function main() {
  const formatArg = process.argv.includes("--csv") ? "csv" : "json";
  const tables = await prisma.diningTable.findMany({
    where: { active: true },
    orderBy: { number: "asc" },
  });

  const rows = tables.map((table) => ({
    tableNumber: table.number,
    url: `${env.CLIENT_ORIGIN}/table/${table.number}?key=${table.qrToken}`,
  }));

  const exportDir = path.resolve(process.cwd(), "qr-export");
  await fs.mkdir(exportDir, { recursive: true });

  const fileName = formatArg === "csv" ? "tables.csv" : "tables.json";
  const filePath = path.join(exportDir, fileName);

  if (formatArg === "csv") {
    const header = "tableNumber,url";
    const lines = rows.map(
      ({ tableNumber, url }) => `${tableNumber},${JSON.stringify(url)}`
    );
    await fs.writeFile(filePath, `${header}\n${lines.join("\n")}\n`, "utf8");
  } else {
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2), "utf8");
  }

  console.log(`[qr] Wrote ${rows.length} table URLs to ${path.relative(process.cwd(), filePath)}.`);
}

main()
  .catch((error) => {
    console.error("[qr] Failed to export table QR links:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
