import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { getSocketServer } from "../lib/http-context";
import { emitToStaff, emitToTable } from "../realtime/emit";
import { EVENTS } from "../realtime/events";
import {
  createCallSchema,
  createOrderSchema,
  menuQuerySchema,
  requestBillSchema,
  tableKeyQuerySchema,
  tableNumberParamsSchema,
} from "../schemas";
import { createStaffCall } from "../services/call.service";
import { requestBill } from "../services/bill.service";
import { assertGuestAccess } from "../services/cafe-settings.service";
import { getPublicMenu } from "../services/menu.service";
import { createOrder, getTableSession } from "../services/order.service";
import { getTableByNumber } from "../services/table.service";
import {
  orderIpLimiter,
  orderLimiter,
  publicLimiter,
  serviceIpLimiter,
  serviceLimiter,
} from "../middleware/rate-limit";

const router = Router();

router.get(
  "/tables/:number/menu",
  publicLimiter,
  asyncHandler(async (req, res) => {
    const { number } = tableNumberParamsSchema.parse(req.params);
    const { key, lat, lng } = menuQuerySchema.parse(req.query);
    const table = await getTableByNumber(number, key);
    await assertGuestAccess({ lat, lng });
    res.json(await getPublicMenu(table));
  })
);

router.get(
  "/tables/:number/session",
  publicLimiter,
  asyncHandler(async (req, res) => {
    const { number } = tableNumberParamsSchema.parse(req.params);
    const { key } = tableKeyQuerySchema.parse(req.query);
    res.json(await getTableSession(number, key));
  })
);

router.post(
  "/orders",
  orderLimiter,
  orderIpLimiter,
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const order = await createOrder(input);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.ORDER_CREATED, order);
    emitToTable(io, order.tableId, EVENTS.ORDER_CREATED, order);

    res.status(201).json({ order });
  })
);

router.post(
  "/calls",
  serviceLimiter,
  serviceIpLimiter,
  asyncHandler(async (req, res) => {
    const input = createCallSchema.parse(req.body);
    const call = await createStaffCall(input);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.CALL_CREATED, call);
    emitToTable(io, call.tableId, EVENTS.CALL_CREATED, call);

    res.status(201).json({ call });
  })
);

router.post(
  "/bills",
  serviceLimiter,
  serviceIpLimiter,
  asyncHandler(async (req, res) => {
    const input = requestBillSchema.parse(req.body);
    const bill = await requestBill(input);

    const io = getSocketServer(req);
    emitToStaff(io, EVENTS.BILL_CREATED, bill);
    emitToTable(io, bill.tableId, EVENTS.BILL_CREATED, bill);

    res.status(201).json({ bill });
  })
);

export default router;
