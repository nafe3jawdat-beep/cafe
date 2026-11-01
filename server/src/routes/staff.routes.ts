import crypto from "node:crypto";
import { Router } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../lib/async-handler";
import { getSocketServer, staffSession } from "../lib/http-context";
import { notFound } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import {
  getUploadedImage,
  menuImageUpload,
  removeMenuImage,
  saveMenuImage,
} from "../middleware/menu-image-upload";
import { emitToStaff, emitToTable } from "../realtime/emit";
import { EVENTS } from "../realtime/events";
import {
  createCategorySchema,
  createExpenseSchema,
  createMenuItemSchema,
  createTableSchema,
  financialReportQuerySchema,
  staffBillsQuerySchema,
  staffCallsQuerySchema,
  staffOrdersQuerySchema,
  updateAvailabilitySchema,
  updateCallSchema,
  updateMenuItemSchema,
  updateOrderStatusSchema,
} from "../schemas";
import { getStaffBills, settleBill } from "../services/bill.service";
import { getStaffCalls, updateStaffCall } from "../services/call.service";
import {
  createFinancialExpense,
  deleteFinancialExpense,
  getFinancialReport,
} from "../services/finance.service";
import {
  createCategory,
  createMenuItem,
  deleteMenuItem,
  getStaffMenu,
  setMenuItemAvailability,
  updateMenuItem,
} from "../services/menu.service";
import {
  getStaffOrders,
  getStaffStats,
  getStaffTables,
  updateOrderStatus,
} from "../services/order.service";
import { createStaffTable, deleteStaffTable } from "../services/table.service";

const router = Router();

function normalizeMenuItemBody(body: Record<string, unknown>) {
  const normalized = { ...body };
  for (const key of ["available", "featured"] as const) {
    if (normalized[key] === "true") normalized[key] = true;
    if (normalized[key] === "false") normalized[key] = false;
  }
  return normalized;
}

// The dashboard is admin-only. Legacy manager/waiter roles are kept in the
// database enum for compatibility, but they cannot access these routes.
router.use(requireRole("ADMIN"));

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await getStaffStats());
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { scope } = staffOrdersQuerySchema.parse(req.query);
    res.json({ orders: await getStaffOrders(scope) });
  })
);

router.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = updateOrderStatusSchema.parse(req.body);
    const staff = staffSession(req);
    const order = await updateOrderStatus(req.params.id!, status, staff);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.ORDER_UPDATED, order);
    emitToTable(io, order.tableId, EVENTS.ORDER_UPDATED, order);

    res.json({ order });
  })
);

router.get(
  "/calls",
  asyncHandler(async (req, res) => {
    const { scope } = staffCallsQuerySchema.parse(req.query);
    res.json({ calls: await getStaffCalls(scope) });
  })
);

router.patch(
  "/calls/:id",
  asyncHandler(async (req, res) => {
    const { status } = updateCallSchema.parse(req.body);
    const staff = staffSession(req);
    const call = await updateStaffCall(req.params.id!, status, staff.id);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.CALL_UPDATED, call);
    emitToTable(io, call.tableId, EVENTS.CALL_UPDATED, call);

    res.json({ call });
  })
);

router.get(
  "/bills",
  asyncHandler(async (req, res) => {
    const { scope } = staffBillsQuerySchema.parse(req.query);
    res.json({ bills: await getStaffBills(scope) });
  })
);

router.patch(
  "/bills/:id/settle",
  asyncHandler(async (req, res) => {
    const staff = staffSession(req);
    const bill = await settleBill(req.params.id!, staff.id);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.BILL_UPDATED, bill);
    emitToTable(io, bill.tableId, EVENTS.BILL_UPDATED, bill);

    res.json({ bill });
  })
);

router.get(
  "/finance",
  asyncHandler(async (req, res) => {
    const range = financialReportQuerySchema.parse(req.query);
    res.json(await getFinancialReport(range));
  })
);

router.post(
  "/expenses",
  asyncHandler(async (req, res) => {
    const input = createExpenseSchema.parse(req.body);
    const expense = await createFinancialExpense(input);
    res.status(201).json({ expense });
  })
);

router.delete(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    await deleteFinancialExpense(req.params.id!);
    res.status(204).end();
  })
);

router.get(
  "/menu",
  asyncHandler(async (_req, res) => {
    res.json(await getStaffMenu());
  })
);

router.post(
  "/menu/categories",
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const category = await createCategory(input);

    getSocketServer(req).emit(EVENTS.MENU_UPDATED, {
      action: "created",
      categoryId: category.id,
    });
    res.status(201).json({ category });
  })
);

router.post(
  "/menu/items",
  menuImageUpload,
  asyncHandler(async (req, res) => {
    const input = createMenuItemSchema.parse(normalizeMenuItemBody(req.body));
    const uploadedImage = getUploadedImage(req);
    const uploadedImageUrl = uploadedImage
      ? await saveMenuImage(uploadedImage)
      : null;
    if (uploadedImageUrl) input.imageUrl = uploadedImageUrl;

    let item;
    try {
      item = await createMenuItem(input);
    } catch (error) {
      if (uploadedImageUrl) {
        try {
          await removeMenuImage(uploadedImageUrl);
        } catch (cleanupError) {
          console.error("[api] Failed to remove an unused menu image:", cleanupError);
        }
      }
      throw error;
    }

    getSocketServer(req).emit(EVENTS.MENU_UPDATED, {
      action: "created",
      itemId: item.id,
    });
    res.status(201).json({ item });
  })
);

router.patch(
  "/menu/items/:id",
  menuImageUpload,
  asyncHandler(async (req, res) => {
    const input = updateMenuItemSchema.parse(normalizeMenuItemBody(req.body));
    const uploadedImage = getUploadedImage(req);
    const uploadedImageUrl = uploadedImage
      ? await saveMenuImage(uploadedImage)
      : null;
    if (uploadedImageUrl) input.imageUrl = uploadedImageUrl;

    let item;
    try {
      item = await updateMenuItem(req.params.id!, input);
    } catch (error) {
      if (uploadedImageUrl) {
        try {
          await removeMenuImage(uploadedImageUrl);
        } catch (cleanupError) {
          console.error("[api] Failed to remove an unused menu image:", cleanupError);
        }
      }
      throw error;
    }

    getSocketServer(req).emit(EVENTS.MENU_UPDATED, {
      action: "updated",
      itemId: item.id,
    });
    res.json({ item });
  })
);

router.delete(
  "/menu/items/:id",
  asyncHandler(async (req, res) => {
    const item = await deleteMenuItem(req.params.id!);

    getSocketServer(req).emit(EVENTS.MENU_UPDATED, {
      action: "deleted",
      itemId: item.id,
    });
    res.status(204).end();
  })
);

router.patch(
  "/menu/items/:id/availability",
  asyncHandler(async (req, res) => {
    const { available } = updateAvailabilitySchema.parse(req.body);
    const item = await setMenuItemAvailability(req.params.id!, available);

    getSocketServer(req).emit(EVENTS.MENU_UPDATED, {
      action: "updated",
      itemId: item.id,
    });
    res.json({ item });
  })
);

router.get(
  "/tables",
  asyncHandler(async (_req, res) => {
    res.json({ tables: await getStaffTables() });
  })
);

router.post(
  "/tables",
  asyncHandler(async (req, res) => {
    const input = createTableSchema.parse(req.body);
    const table = await createStaffTable(input);

    res.status(201).json({
      table: {
        ...table,
        activeOrderCount: 0,
        pendingCount: 0,
        openBill: null,
      },
    });
  })
);

router.delete(
  "/tables/:id",
  asyncHandler(async (req, res) => {
    await deleteStaffTable(req.params.id!);
    res.status(204).end();
  })
);

router.post(
  "/tables/:id/rotate-key",
  asyncHandler(async (req, res) => {
    const tableId = req.params.id;
    if (!tableId || tableId.length < 1) {
      throw notFound("Table not found.");
    }

    const table = await prisma.diningTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw notFound("Table not found.");
    }

    const qrToken = crypto.randomBytes(24).toString("base64url");
    const updatedTable = await prisma.diningTable.update({
      where: { id: tableId },
      data: { qrToken },
    });

    res.json({
      tableId: updatedTable.id,
      tableNumber: updatedTable.number,
      qrToken: updatedTable.qrToken,
      url: `${env.CLIENT_ORIGIN}/table/${updatedTable.number}?key=${updatedTable.qrToken}`,
    });
  })
);

export default router;
