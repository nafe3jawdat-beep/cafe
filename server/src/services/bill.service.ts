import type { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { assertGuestAccess } from "./cafe-settings.service";
import { calculateTotals } from "./pricing";
import { getTableByNumber } from "./table.service";

const billInclude = {
  table: { select: { id: true, number: true, name: true } },
  settledBy: { select: { id: true, name: true } },
  orders: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
          notes: true,
        },
      },
    },
  },
} satisfies Prisma.BillRequestInclude;

const POSTGRES_INT_MAX = 2_147_483_647n;

export function sumBillAmount(
  orders: Array<{
    subtotalCents: number;
    taxCents: number;
    serviceChargeCents: number;
    totalCents: number;
  }>,
  field: "subtotalCents" | "taxCents" | "serviceChargeCents" | "totalCents"
) {
  const total = orders.reduce((sum, order) => sum + BigInt(order[field]), 0n);
  if (total > POSTGRES_INT_MAX) {
    throw badRequest("The table's bill exceeds the supported amount.");
  }
  return Number(total);
}

export interface RequestBillInput {
  tableNumber: number;
  tableKey?: string;
  lat?: number;
  lng?: number;
}

export async function requestBill(input: RequestBillInput) {
  const table = await getTableByNumber(input.tableNumber, input.tableKey);
  await assertGuestAccess({ lat: input.lat, lng: input.lng });

  const existing = await prisma.billRequest.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    include: billInclude,
  });
  if (existing) return existing;

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      billId: null,
      status: { not: "CANCELLED" },
    },
    select: { id: true, totalCents: true, subtotalCents: true, taxCents: true, serviceChargeCents: true },
  });

  if (orders.length === 0) {
    throw badRequest("There are no orders to bill for this table yet.");
  }

  const subtotalCents = sumBillAmount(orders, "subtotalCents");
  const taxCents = sumBillAmount(orders, "taxCents");
  const serviceChargeCents = sumBillAmount(orders, "serviceChargeCents");
  const totalCents = sumBillAmount(orders, "totalCents");

  // Recompute from configuration as a guard against historical drift.
  const expected = calculateTotals(subtotalCents);
  if (expected.totalCents !== totalCents) {
    // Keep the order-level totals; they are the amounts the customer agreed to.
    console.warn(
      `[billing] Table ${table.number} total mismatch: orders=${totalCents}, expected=${expected.totalCents}`
    );
  }

  return prisma.billRequest.create({
    data: {
      tableId: table.id,
      subtotalCents,
      taxCents,
      serviceChargeCents,
      totalCents,
      orders: { connect: orders.map((order) => ({ id: order.id })) },
    },
    include: billInclude,
  });
}

export async function settleBill(billId: string, staffId: string) {
  const bill = await prisma.billRequest.findUnique({ where: { id: billId } });
  if (!bill) throw notFound("Bill not found.");
  if (bill.status === "SETTLED") {
    throw conflict("This bill has already been settled.");
  }
  if (bill.status === "CANCELLED") {
    throw conflict("This bill was cancelled.");
  }

  return prisma.billRequest.update({
    where: { id: billId },
    data: {
      status: "SETTLED",
      settledAt: new Date(),
      settledById: staffId,
    },
    include: billInclude,
  });
}

export async function getStaffBills(scope: "open" | "all") {
  return prisma.billRequest.findMany({
    where: scope === "open" ? { status: "OPEN" } : {},
    include: billInclude,
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
}
