import { Prisma, type OrderStatus, type Role } from "@prisma/client";
import { env } from "../config/env";
import { conflict, forbidden, notFound, badRequest } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { allowedOrderTransitions } from "./order-status";
import { calculateTotals } from "./pricing";
import { getTableByNumber, publicTable } from "./table.service";

export const orderInclude = {
  table: { select: { id: true, number: true, name: true } },
  items: true,
  bill: {
    select: { id: true, status: true, totalCents: true },
  },
} satisfies Prisma.OrderInclude;

export interface CreateOrderInput {
  tableNumber: number;
  tableKey?: string;
  clientRequestId: string;
  customerName?: string;
  note?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
  }>;
}

export async function createOrder(input: CreateOrderInput) {
  const table = await getTableByNumber(input.tableNumber, input.tableKey);

  const existing = await prisma.order.findUnique({
    where: { clientRequestId: input.clientRequestId },
    include: orderInclude,
  });

  if (existing) {
    if (existing.tableId !== table.id) {
      throw conflict("This order reference belongs to another table.");
    }
    return existing;
  }

  const openBill = await prisma.billRequest.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    select: { id: true },
  });

  if (openBill) {
    throw conflict(
      "A bill has already been requested for this table. Please ask a staff member to add more items."
    );
  }

  const uniqueIds = [...new Set(input.items.map((item) => item.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: uniqueIds } },
    include: { category: { select: { active: true } } },
  });

  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const lines = input.items.map((inputLine) => {
    const menuItem = byId.get(inputLine.menuItemId);
    if (!menuItem) {
      throw badRequest("One of the items is no longer on the menu.");
    }
    if (!menuItem.available || !menuItem.category.active) {
      throw conflict(`${menuItem.name} is currently unavailable.`);
    }

    const notes = inputLine.notes?.trim() || null;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPriceCents: menuItem.priceCents,
      quantity: inputLine.quantity,
      notes,
      lineTotalCents: menuItem.priceCents * inputLine.quantity,
    };
  });

  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0
  );
  const totals = calculateTotals(subtotalCents);

  try {
    return await prisma.order.create({
      data: {
        clientRequestId: input.clientRequestId,
        tableId: table.id,
        customerName: input.customerName?.trim() || null,
        note: input.note?.trim() || null,
        ...totals,
        items: { create: lines },
      },
      include: orderInclude,
    });
  } catch (error) {
    // A retry can race the first request. Return the already-created order.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.order.findUnique({
        where: { clientRequestId: input.clientRequestId },
        include: orderInclude,
      });
      if (raced) return raced;
    }
    throw error;
  }
}

export async function getTableSession(
  tableNumber: number,
  tableKey?: string
) {
  const table = await getTableByNumber(tableNumber, tableKey);
  const latestSettlement = await prisma.billRequest.findFirst({
    where: { tableId: table.id, status: "SETTLED" },
    orderBy: { settledAt: "desc" },
    select: { settledAt: true },
  });
  // A new seating starts when the previous bill is settled. If the table has
  // not been billed yet, fall back to a rolling 12-hour window.
  const since =
    latestSettlement?.settledAt ?? new Date(Date.now() - 12 * 60 * 60 * 1000);

  const [orders, openBill, calls] = await Promise.all([
    prisma.order.findMany({
      where: {
        tableId: table.id,
        status: { not: "CANCELLED" },
        createdAt: { gte: since },
      },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.billRequest.findFirst({
      where: { tableId: table.id, status: "OPEN" },
      include: { table: { select: { id: true, number: true, name: true } } },
    }),
    prisma.staffCall.findMany({
      where: {
        tableId: table.id,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    table: publicTable(table),
    orders,
    openBill,
    calls,
    pricing: {
      currency: env.CURRENCY,
      taxRate: env.TAX_RATE,
      serviceChargeRate: env.SERVICE_CHARGE_RATE,
    },
  };
}

export async function getStaffOrders(scope: "active" | "today" | "all") {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const where: Prisma.OrderWhereInput =
    scope === "active"
      ? { status: { in: ["PENDING", "PREPARING", "READY"] } }
      : scope === "today"
        ? { createdAt: { gte: startOfToday } }
        : {};

  return prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: scope === "active" ? 100 : 200,
  });
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  staff: { id: string; role: Role }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) throw notFound("Order not found.");
  if (order.status === nextStatus) return order;

  const allowed = allowedOrderTransitions(order.status);
  if (!allowed.includes(nextStatus)) {
    throw conflict(
      `Order cannot move from ${order.status} to ${nextStatus}.`,
      { allowed }
    );
  }

  if (nextStatus === "CANCELLED") {
    if (staff.role !== "ADMIN") {
      throw forbidden("Only an administrator can cancel an order.");
    }
    if (order.billId) {
      throw conflict("This order is already on a bill and cannot be cancelled.");
    }
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    include: orderInclude,
  });
}

export async function getStaffStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [revenue, activeOrders, openCalls, occupiedTables, openBills] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfToday },
          status: { not: "CANCELLED" },
        },
        _sum: { totalCents: true },
        _count: true,
      }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      }),
      prisma.staffCall.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      }),
      prisma.order.findMany({
        where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
        distinct: ["tableId"],
        select: { tableId: true },
      }),
      prisma.billRequest.count({ where: { status: "OPEN" } }),
    ]);

  return {
    revenueTodayCents: revenue._sum.totalCents ?? 0,
    ordersToday: revenue._count,
    activeOrders,
    openCalls,
    occupiedTables: occupiedTables.length,
    openBills,
    currency: env.CURRENCY,
  };
}

export async function getStaffTables() {
  const [tables, activeOrders, openBills] = await Promise.all([
    prisma.diningTable.findMany({
      where: { active: true },
      orderBy: { number: "asc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      select: { tableId: true, status: true },
    }),
    prisma.billRequest.findMany({
      where: { status: "OPEN" },
      select: { tableId: true, totalCents: true },
    }),
  ]);

  return tables.map((table) => {
    const orders = activeOrders.filter((order) => order.tableId === table.id);
    const bill = openBills.find((entry) => entry.tableId === table.id);
    return {
      ...table,
      activeOrderCount: orders.length,
      pendingCount: orders.filter((order) => order.status === "PENDING").length,
      openBill: bill ?? null,
    };
  });
}
