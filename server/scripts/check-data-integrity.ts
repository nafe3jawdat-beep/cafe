import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("[db:check-integrity] Refusing to run in production.");
  process.exit(1);
}

const prisma = new PrismaClient();

const integrityQuery = `
WITH violations(rule, id) AS (
  SELECT 'BillRequest_one_open_per_table', bill."id"
  FROM "BillRequest" AS bill
  WHERE bill."status" = 'OPEN'
    AND bill."tableId" IN (
      SELECT "tableId"
      FROM "BillRequest"
      WHERE "status" = 'OPEN'
      GROUP BY "tableId"
      HAVING COUNT(*) > 1
    )
  UNION ALL
  SELECT 'MenuItem_price_nonneg', "id"
  FROM "MenuItem"
  WHERE "priceCents" < 0
  UNION ALL
  SELECT 'OrderItem_quantity_pos', "id"
  FROM "OrderItem"
  WHERE "quantity" <= 0
  UNION ALL
  SELECT 'OrderItem_unit_price_nonneg', "id"
  FROM "OrderItem"
  WHERE "unitPriceCents" < 0
  UNION ALL
  SELECT 'OrderItem_line_total_consistent', "id"
  FROM "OrderItem"
  WHERE "lineTotalCents"::BIGINT <>
    "unitPriceCents"::BIGINT * "quantity"::BIGINT
  UNION ALL
  SELECT 'Order_amounts_nonneg', "id"
  FROM "Order"
  WHERE "subtotalCents" < 0 OR "taxCents" < 0 OR "serviceChargeCents" < 0
  UNION ALL
  SELECT 'Order_total_consistent', "id"
  FROM "Order"
  WHERE "totalCents"::BIGINT <>
    "subtotalCents"::BIGINT + "taxCents"::BIGINT + "serviceChargeCents"::BIGINT
  UNION ALL
  SELECT 'BillRequest_amounts_nonneg', "id"
  FROM "BillRequest"
  WHERE "subtotalCents" < 0 OR "taxCents" < 0 OR "serviceChargeCents" < 0
  UNION ALL
  SELECT 'BillRequest_total_consistent', "id"
  FROM "BillRequest"
  WHERE "totalCents"::BIGINT <>
    "subtotalCents"::BIGINT + "taxCents"::BIGINT + "serviceChargeCents"::BIGINT
  UNION ALL
  SELECT 'BillRequest_settled_has_timestamp', "id"
  FROM "BillRequest"
  WHERE "status" = 'SETTLED' AND "settledAt" IS NULL
  UNION ALL
  SELECT 'FinancialExpense_amount_pos', "id"
  FROM "FinancialExpense"
  WHERE "amountCents" <= 0
  UNION ALL
  SELECT 'Order_orderNumber_key', "id"
  FROM "Order"
  WHERE "orderNumber" IN (
    SELECT "orderNumber"
    FROM "Order"
    GROUP BY "orderNumber"
    HAVING COUNT(*) > 1
  )
),
rules(rule) AS (
  VALUES
    ('BillRequest_one_open_per_table'),
    ('MenuItem_price_nonneg'),
    ('OrderItem_quantity_pos'),
    ('OrderItem_unit_price_nonneg'),
    ('OrderItem_line_total_consistent'),
    ('Order_amounts_nonneg'),
    ('Order_total_consistent'),
    ('BillRequest_amounts_nonneg'),
    ('BillRequest_total_consistent'),
    ('BillRequest_settled_has_timestamp'),
    ('FinancialExpense_amount_pos'),
    ('Order_orderNumber_key')
)
SELECT
  rules.rule,
  COUNT(violations.id)::INTEGER AS \"violatingRows\",
  COALESCE(
    (ARRAY_AGG(violations.id ORDER BY violations.id)
      FILTER (WHERE violations.id IS NOT NULL))[1:5],
    ARRAY[]::TEXT[]
  ) AS \"exampleIds\"
FROM rules
LEFT JOIN violations ON violations.rule = rules.rule
GROUP BY rules.rule
ORDER BY rules.rule
`;

async function main() {
  const results = await prisma.$queryRawUnsafe<
    Array<{
      rule: string;
      violatingRows: number;
      exampleIds: string[];
    }>
  >(integrityQuery);

  const violatingRules: string[] = [];

  for (const result of results) {
    const exampleIds = result.exampleIds.length
      ? result.exampleIds.join(", ")
      : "none";
    console.log(
      `${result.rule}: COUNT=${result.violatingRows}; example ids=${exampleIds}`
    );

    if (result.violatingRows > 0) {
      violatingRules.push(result.rule);
    }
  }

  if (violatingRules.length > 0) {
    console.error(
      `[db:check-integrity] Found violations in ${violatingRules.length} rule(s); no data was changed.`
    );
    process.exitCode = 2;
  } else {
    console.log("[db:check-integrity] No integrity violations found.");
  }
}

main()
  .catch((error) => {
    console.error("[db:check-integrity] Failed to check the database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
