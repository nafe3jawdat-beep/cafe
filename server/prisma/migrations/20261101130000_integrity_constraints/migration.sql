-- Prisma Migrate cannot represent the partial index below in schema.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "BillRequest_one_open_per_table"
ON "BillRequest"("tableId")
WHERE "status" = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key"
ON "Order"("orderNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"MenuItem"'::regclass
      AND conname = 'MenuItem_price_nonneg'
  ) THEN
    ALTER TABLE "MenuItem"
      ADD CONSTRAINT "MenuItem_price_nonneg"
      CHECK ("priceCents" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"OrderItem"'::regclass
      AND conname = 'OrderItem_quantity_pos'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_quantity_pos"
      CHECK ("quantity" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"OrderItem"'::regclass
      AND conname = 'OrderItem_unit_price_nonneg'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_unit_price_nonneg"
      CHECK ("unitPriceCents" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"OrderItem"'::regclass
      AND conname = 'OrderItem_line_total_consistent'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_line_total_consistent"
      CHECK (
        "lineTotalCents"::BIGINT =
        "unitPriceCents"::BIGINT * "quantity"::BIGINT
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"Order"'::regclass
      AND conname = 'Order_amounts_nonneg'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_amounts_nonneg"
      CHECK (
        "subtotalCents" >= 0
        AND "taxCents" >= 0
        AND "serviceChargeCents" >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"Order"'::regclass
      AND conname = 'Order_total_consistent'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_total_consistent"
      CHECK (
        "totalCents"::BIGINT =
        "subtotalCents"::BIGINT
        + "taxCents"::BIGINT
        + "serviceChargeCents"::BIGINT
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"BillRequest"'::regclass
      AND conname = 'BillRequest_amounts_nonneg'
  ) THEN
    ALTER TABLE "BillRequest"
      ADD CONSTRAINT "BillRequest_amounts_nonneg"
      CHECK (
        "subtotalCents" >= 0
        AND "taxCents" >= 0
        AND "serviceChargeCents" >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"BillRequest"'::regclass
      AND conname = 'BillRequest_total_consistent'
  ) THEN
    ALTER TABLE "BillRequest"
      ADD CONSTRAINT "BillRequest_total_consistent"
      CHECK (
        "totalCents"::BIGINT =
        "subtotalCents"::BIGINT
        + "taxCents"::BIGINT
        + "serviceChargeCents"::BIGINT
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"BillRequest"'::regclass
      AND conname = 'BillRequest_settled_has_timestamp'
  ) THEN
    ALTER TABLE "BillRequest"
      ADD CONSTRAINT "BillRequest_settled_has_timestamp"
      CHECK ("status" <> 'SETTLED' OR "settledAt" IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"FinancialExpense"'::regclass
      AND conname = 'FinancialExpense_amount_pos'
  ) THEN
    ALTER TABLE "FinancialExpense"
      ADD CONSTRAINT "FinancialExpense_amount_pos"
      CHECK ("amountCents" > 0);
  END IF;
END
$$;
