import "dotenv/config";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("[db:test-integrity] Refusing to run in production.");
  process.exit(1);
}

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) {
  throw new Error("DATABASE_URL is required to run integrity migration tests.");
}

const databaseName = `cafe_qr_integrity_test_${Date.now()}`;
const shadowDatabaseName = `${databaseName}_shadow`;
const sourceDatabaseUrl = new URL(sourceUrl);
const testDatabaseUrl = new URL(sourceUrl);
const shadowDatabaseUrl = new URL(sourceUrl);
testDatabaseUrl.pathname = `/${databaseName}`;
shadowDatabaseUrl.pathname = `/${shadowDatabaseName}`;

const admin = new PrismaClient({ datasourceUrl: sourceDatabaseUrl.toString() });
let testDatabase: PrismaClient | undefined;
let createdDatabase = false;
let createdShadowDatabase = false;

function runPrisma(args: string[], databaseUrl: string) {
  const prismaCliPath = require.resolve("prisma/build/index.js");
  return spawnSync(process.execPath, [prismaCliPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function expectConstraint(
  expectedConstraint: string,
  statement: string
) {
  const quotedConstraint = expectedConstraint.replaceAll("'", "''");
  await testDatabase!.$executeRawUnsafe(`
    DO $constraint_test$
    DECLARE
      actual_constraint TEXT;
      violation_caught BOOLEAN := FALSE;
    BEGIN
      BEGIN
        ${statement};
      EXCEPTION
        WHEN check_violation OR unique_violation THEN
          GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
          violation_caught := TRUE;
      END;

      IF NOT violation_caught THEN
        RAISE EXCEPTION 'Expected constraint % to reject the row',
          '${quotedConstraint}';
      END IF;

      IF actual_constraint <> '${quotedConstraint}' THEN
        RAISE EXCEPTION 'Expected constraint %, received %',
          '${quotedConstraint}', actual_constraint;
      END IF;
    END;
    $constraint_test$;
  `);
  console.log(`PASS ${expectedConstraint}`);
}

function insertOrderSql(
  id: string,
  tableId: string,
  amount: { subtotal: number; tax: number; service: number; total: number },
  orderNumber?: number
) {
  const orderNumberColumn = orderNumber === undefined ? "" : '"orderNumber",';
  const orderNumberValue = orderNumber === undefined ? "" : `${orderNumber},`;
  return `
    INSERT INTO "Order" (
      "id", ${orderNumberColumn} "tableId", "subtotalCents", "taxCents",
      "serviceChargeCents", "totalCents", "updatedAt"
    ) VALUES (
      '${id}', ${orderNumberValue} '${tableId}', ${amount.subtotal},
      ${amount.tax}, ${amount.service}, ${amount.total}, NOW()
    )
  `;
}

function insertBillSql(
  id: string,
  tableId: string,
  amount: { subtotal: number; tax: number; service: number; total: number },
  status = "OPEN",
  settledAt: string | null = null
) {
  const settledAtSql = settledAt === null ? "NULL" : `'${settledAt}'`;
  return `
    INSERT INTO "BillRequest" (
      "id", "tableId", "status", "subtotalCents", "taxCents",
      "serviceChargeCents", "totalCents", "settledAt", "updatedAt"
    ) VALUES (
      '${id}', '${tableId}', '${status}', ${amount.subtotal}, ${amount.tax},
      ${amount.service}, ${amount.total}, ${settledAtSql}, NOW()
    )
  `;
}

async function run() {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  createdDatabase = true;
  await admin.$executeRawUnsafe(`CREATE DATABASE "${shadowDatabaseName}"`);
  createdShadowDatabase = true;

  const diff = runPrisma(
    [
      "migrate",
      "diff",
      "--from-migrations",
      "prisma/migrations",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--shadow-database-url",
      shadowDatabaseUrl.toString(),
      "--script",
    ],
    testDatabaseUrl.toString()
  );

  const diffOutput = diff.stdout.trim();
  if (
    diff.status !== 0 ||
    (diffOutput !== "" && diffOutput !== "-- This is an empty migration.")
  ) {
    throw new Error(
      `Expected Prisma migrate diff to be empty:\n${diff.stdout}\n${diff.stderr}`
    );
  }
  console.log("PASS prisma migrate diff produced an empty result");

  const migration = runPrisma(
    ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
    testDatabaseUrl.toString()
  );

  if (migration.status !== 0) {
    throw new Error(
      `Fresh-database migrate deploy failed:\n${migration.stdout}\n${migration.stderr}`
    );
  }
  console.log("PASS fresh database migrate deploy");
  testDatabase = new PrismaClient({
    datasourceUrl: testDatabaseUrl.toString(),
  });

  const table = await testDatabase.diningTable.create({
    data: { number: 1, name: "Integrity test", qrToken: "integrity-test-key" },
  });
  const extraTables = await Promise.all(
    [2, 3, 4].map((number) =>
      testDatabase!.diningTable.create({
        data: {
          number,
          name: "Integrity test",
          qrToken: `integrity-test-key-${number}`,
        },
      })
    )
  );
  const category = await testDatabase.category.create({
    data: {
      slug: "integrity-test-category",
      name: "Integrity test",
    },
  });
  const order = await testDatabase.order.create({
    data: {
      tableId: table.id,
      subtotalCents: 0,
      taxCents: 0,
      serviceChargeCents: 0,
      totalCents: 0,
    },
  });
  await testDatabase.billRequest.create({
    data: {
      tableId: table.id,
      subtotalCents: 0,
      taxCents: 0,
      serviceChargeCents: 0,
      totalCents: 0,
    },
  });

  await expectConstraint(
    "BillRequest_one_open_per_table",
    insertBillSql("duplicate-open-bill", table.id, {
      subtotal: 0,
      tax: 0,
      service: 0,
      total: 0,
    })
  );
  await expectConstraint(
    "MenuItem_price_nonneg",
    `INSERT INTO "MenuItem" ("id", "categoryId", "slug", "name", "priceCents", "updatedAt")
     VALUES ('negative-menu-item', '${category.id}', 'negative-menu-item', 'Invalid', -1, NOW())`
  );
  await expectConstraint(
    "OrderItem_quantity_pos",
    `INSERT INTO "OrderItem" ("id", "orderId", "name", "unitPriceCents", "quantity", "lineTotalCents")
     VALUES ('zero-quantity', '${order.id}', 'Invalid', 0, 0, 0)`
  );
  await expectConstraint(
    "OrderItem_unit_price_nonneg",
    `INSERT INTO "OrderItem" ("id", "orderId", "name", "unitPriceCents", "quantity", "lineTotalCents")
     VALUES ('negative-unit-price', '${order.id}', 'Invalid', -1, 1, -1)`
  );
  await expectConstraint(
    "OrderItem_line_total_consistent",
    `INSERT INTO "OrderItem" ("id", "orderId", "name", "unitPriceCents", "quantity", "lineTotalCents")
     VALUES ('inconsistent-line-total', '${order.id}', 'Invalid', 5, 2, 9)`
  );
  await expectConstraint(
    "Order_amounts_nonneg",
    insertOrderSql("negative-order-amount", table.id, {
      subtotal: -1,
      tax: 0,
      service: 0,
      total: -1,
    })
  );
  await expectConstraint(
    "Order_total_consistent",
    insertOrderSql("inconsistent-order-total", table.id, {
      subtotal: 1,
      tax: 0,
      service: 0,
      total: 0,
    })
  );
  await expectConstraint(
    "BillRequest_amounts_nonneg",
    insertBillSql("negative-bill-amount", extraTables[0]!.id, {
      subtotal: -1,
      tax: 0,
      service: 0,
      total: -1,
    })
  );
  await expectConstraint(
    "BillRequest_total_consistent",
    insertBillSql("inconsistent-bill-total", extraTables[1]!.id, {
      subtotal: 1,
      tax: 0,
      service: 0,
      total: 0,
    })
  );
  await expectConstraint(
    "BillRequest_settled_has_timestamp",
    insertBillSql(
      "settled-bill-without-time",
      extraTables[2]!.id,
      { subtotal: 0, tax: 0, service: 0, total: 0 },
      "SETTLED"
    )
  );
  await expectConstraint(
    "FinancialExpense_amount_pos",
    `INSERT INTO "FinancialExpense" ("id", "date", "description", "amountCents")
     VALUES ('zero-expense', CURRENT_DATE, 'Invalid', 0)`
  );
  await expectConstraint(
    "Order_orderNumber_key",
    insertOrderSql(
      "duplicate-order-number",
      table.id,
      { subtotal: 0, tax: 0, service: 0, total: 0 },
      order.orderNumber
    )
  );
}

run()
  .catch((error) => {
    console.error("[db:test-integrity] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await testDatabase?.$disconnect();
    if (createdDatabase) {
      await admin.$executeRawUnsafe(
        `DROP DATABASE "${databaseName}" WITH (FORCE)`
      );
      console.log("[db:test-integrity] Temporary database removed.");
    }
    if (createdShadowDatabase) {
      await admin.$executeRawUnsafe(
        `DROP DATABASE "${shadowDatabaseName}" WITH (FORCE)`
      );
      console.log("[db:test-integrity] Temporary shadow database removed.");
    }
    await admin.$disconnect();
  });
