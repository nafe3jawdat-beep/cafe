import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { conflict, forbidden, notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";

export async function createStaffTable(input: {
  number: number;
  name?: string;
}) {
  const existing = await prisma.diningTable.findUnique({
    where: { number: input.number },
  });
  const data = {
    active: true,
    qrToken: crypto.randomBytes(24).toString("base64url"),
  };

  if (existing?.active) {
    throw conflict("A table with that number already exists.");
  }

  try {
    if (existing) {
      return await prisma.diningTable.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(input.name !== undefined
            ? { name: input.name.trim() || null }
            : {}),
        },
      });
    }

    return await prisma.diningTable.create({
      data: {
        number: input.number,
        name: input.name?.trim() || null,
        ...data,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("A table with that number already exists.");
    }
    throw error;
  }
}

export async function deleteStaffTable(tableId: string) {
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    select: { id: true, active: true },
  });
  if (!table || !table.active) throw notFound("Table not found.");

  const [activeOrderCount, openBillCount] = await Promise.all([
    prisma.order.count({
      where: {
        tableId,
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
    }),
    prisma.billRequest.count({ where: { tableId, status: "OPEN" } }),
  ]);
  if (activeOrderCount > 0 || openBillCount > 0) {
    throw conflict(
      "A table with active orders or an open bill cannot be deleted."
    );
  }

  return prisma.diningTable.update({
    where: { id: tableId },
    data: { active: false },
  });
}

export async function getTableByNumber(
  tableNumber: number,
  tableKey?: string
) {
  const table = await prisma.diningTable.findUnique({
    where: { number: tableNumber },
  });

  if (!table || !table.active) {
    throw notFound("This table is not available. Please ask a staff member.");
  }

  if (env.REQUIRE_TABLE_KEY) {
    if (!tableKey) {
      throw forbidden(
        "This table link is invalid or has expired. Please scan the QR code on your table again."
      );
    }

    const expected = Buffer.from(table.qrToken, "utf8");
    const supplied = Buffer.from(tableKey, "utf8");

    if (
      expected.length !== supplied.length ||
      !crypto.timingSafeEqual(expected, supplied)
    ) {
      throw forbidden(
        "This table link is invalid or has expired. Please scan the QR code on your table again."
      );
    }
  }

  return table;
}

export function publicTable(table: {
  id: string;
  number: number;
  name: string | null;
}) {
  return {
    id: table.id,
    number: table.number,
    name: table.name,
  };
}
