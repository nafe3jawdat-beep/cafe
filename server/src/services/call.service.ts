import type { CallStatus, CallType, Prisma } from "@prisma/client";
import { conflict, notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { assertGuestAccess } from "./cafe-settings.service";
import { getTableByNumber } from "./table.service";

const callInclude = {
  table: { select: { id: true, number: true, name: true } },
  resolvedBy: { select: { id: true, name: true } },
} satisfies Prisma.StaffCallInclude;

export interface CreateCallInput {
  tableNumber: number;
  tableKey?: string;
  lat?: number;
  lng?: number;
  type: CallType;
  note?: string;
}

export async function createStaffCall(input: CreateCallInput) {
  const table = await getTableByNumber(input.tableNumber, input.tableKey);
  await assertGuestAccess({ lat: input.lat, lng: input.lng });

  // Collapse accidental double taps into one alert for the same request.
  const recent = await prisma.staffCall.findFirst({
    where: {
      tableId: table.id,
      type: input.type,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    include: callInclude,
    orderBy: { createdAt: "desc" },
  });

  if (recent) return recent;

  return prisma.staffCall.create({
    data: {
      tableId: table.id,
      type: input.type,
      note: input.note?.trim() || null,
    },
    include: callInclude,
  });
}

export async function getStaffCalls(scope: "open" | "all") {
  return prisma.staffCall.findMany({
    where:
      scope === "open"
        ? { status: { in: ["OPEN", "ACKNOWLEDGED"] } }
        : {},
    include: callInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function updateStaffCall(
  callId: string,
  status: Exclude<CallStatus, "OPEN">,
  staffId: string
) {
  const call = await prisma.staffCall.findUnique({ where: { id: callId } });
  if (!call) throw notFound("Service request not found.");

  if (call.status === "RESOLVED") {
    throw conflict("This service request has already been resolved.");
  }

  if (status === "ACKNOWLEDGED" && call.status !== "OPEN") {
    throw conflict("Only a new request can be acknowledged.");
  }

  return prisma.staffCall.update({
    where: { id: callId },
    data: {
      status,
      acknowledgedAt:
        status === "ACKNOWLEDGED" ? new Date() : call.acknowledgedAt ?? new Date(),
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedById: status === "RESOLVED" ? staffId : null,
    },
    include: callInclude,
  });
}
