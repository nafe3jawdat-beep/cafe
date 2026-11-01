CREATE TABLE "FinancialExpense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialExpense_date_idx" ON "FinancialExpense"("date");
