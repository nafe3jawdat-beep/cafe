import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    diningTable: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    order: { count: vi.fn() },
    billRequest: { count: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma";
import { createStaffTable, deleteStaffTable } from "./table.service";

describe("staff table management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an active table with a unique random QR token", async () => {
    vi.mocked(prisma.diningTable.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.diningTable.create).mockImplementation(({ data }) =>
      Promise.resolve({ id: "table-1", ...data }) as unknown as ReturnType<
        typeof prisma.diningTable.create
      >
    );

    const table = await createStaffTable({ number: 12, name: "Patio" });

    expect(prisma.diningTable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        number: 12,
        name: "Patio",
        active: true,
        qrToken: expect.any(String),
      }),
    });
    expect(table.qrToken).toHaveLength(32);
  });

  it("rejects an already active table number", async () => {
    vi.mocked(prisma.diningTable.findUnique).mockResolvedValue({
      id: "table-1",
      active: true,
    } as never);

    await expect(createStaffTable({ number: 12 })).rejects.toMatchObject({
      statusCode: 409,
      message: "A table with that number already exists.",
    });
    expect(prisma.diningTable.create).not.toHaveBeenCalled();
  });

  it("reactivates an inactive table with a newly generated QR token", async () => {
    vi.mocked(prisma.diningTable.findUnique).mockResolvedValue({
      id: "table-1",
      number: 12,
      active: false,
      qrToken: "old-token",
    } as never);
    vi.mocked(prisma.diningTable.update).mockImplementation(({ data }) =>
      Promise.resolve({ id: "table-1", ...data }) as unknown as ReturnType<
        typeof prisma.diningTable.update
      >
    );

    const table = await createStaffTable({ number: 12 });

    expect(prisma.diningTable.update).toHaveBeenCalledWith({
      where: { id: "table-1" },
      data: expect.objectContaining({ active: true }),
    });
    expect(table.qrToken).not.toBe("old-token");
  });

  it("does not delete a table with active orders", async () => {
    vi.mocked(prisma.diningTable.findUnique).mockResolvedValue({
      id: "table-1",
      active: true,
    } as never);
    vi.mocked(prisma.order.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.billRequest.count).mockResolvedValue(0 as never);

    await expect(deleteStaffTable("table-1")).rejects.toMatchObject({
      statusCode: 409,
      message: "A table with active orders or an open bill cannot be deleted.",
    });
    expect(prisma.diningTable.update).not.toHaveBeenCalled();
  });

  it("deactivates an unused table while preserving its historical records", async () => {
    vi.mocked(prisma.diningTable.findUnique).mockResolvedValue({
      id: "table-1",
      active: true,
    } as never);
    vi.mocked(prisma.order.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.billRequest.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.diningTable.update).mockResolvedValue({
      id: "table-1",
      active: false,
    } as never);

    await deleteStaffTable("table-1");

    expect(prisma.diningTable.update).toHaveBeenCalledWith({
      where: { id: "table-1" },
      data: { active: false },
    });
  });
});
