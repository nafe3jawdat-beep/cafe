import { env } from "../config/env";
import { notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { rankMenuItems, type ItemSales } from "./finance-report";

export interface FinancialDateRange {
  startDate: string;
  endDate: string;
}

export async function getFinancialReport(range: FinancialDateRange) {
  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const endExclusive = new Date(`${range.endDate}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const createdAt = { gte: start, lt: endExclusive };

  const [orderTotals, expenseTotals, expenses, groupedSales, currentItems] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt },
        _sum: { subtotalCents: true },
        _count: { _all: true },
      }),
      prisma.financialExpense.aggregate({
        where: { date: { gte: start, lt: endExclusive } },
        _sum: { amountCents: true },
      }),
      prisma.financialExpense.findMany({
        where: {
          date: { gte: start, lt: endExclusive },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.orderItem.groupBy({
        by: ["menuItemId", "name"],
        where: {
          order: { status: "DELIVERED", createdAt },
        },
        _sum: { quantity: true, lineTotalCents: true },
      }),
      prisma.menuItem.findMany({
        where: { category: { active: true } },
        select: { id: true, name: true },
      }),
    ]);

  const expenseCents = expenseTotals._sum.amountCents ?? 0;
  const revenueCents = orderTotals._sum.subtotalCents ?? 0;
  const sales: ItemSales[] = groupedSales.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item._sum.quantity ?? 0,
    revenueCents: item._sum.lineTotalCents ?? 0,
  }));
  const rankings = rankMenuItems(currentItems, sales);

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    currency: env.CURRENCY,
    revenueCents,
    expenseCents,
    profitCents: revenueCents - expenseCents,
    deliveredOrders: orderTotals._count._all,
    ...rankings,
    expenses: expenses.map((expense) => ({
      ...expense,
      date: expense.date.toISOString().slice(0, 10),
    })),
  };
}

export async function createFinancialExpense(input: {
  date: string;
  description: string;
  amountCents: number;
}) {
  return prisma.financialExpense.create({
    data: {
      date: new Date(`${input.date}T00:00:00.000Z`),
      description: input.description,
      amountCents: input.amountCents,
    },
  });
}

export async function deleteFinancialExpense(id: string) {
  const existing = await prisma.financialExpense.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw notFound("Expense not found.");

  return prisma.financialExpense.delete({ where: { id } });
}
