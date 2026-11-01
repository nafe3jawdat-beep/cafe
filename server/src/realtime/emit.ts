import type { Server } from "socket.io";
import { EVENTS } from "./events";

export type AppSocketServer = Server;

type StaffEvent =
  | typeof EVENTS.ORDER_CREATED
  | typeof EVENTS.ORDER_UPDATED
  | typeof EVENTS.CALL_CREATED
  | typeof EVENTS.CALL_UPDATED
  | typeof EVENTS.BILL_CREATED
  | typeof EVENTS.BILL_UPDATED;

type TableEvent =
  | typeof EVENTS.ORDER_CREATED
  | typeof EVENTS.ORDER_UPDATED
  | typeof EVENTS.CALL_CREATED
  | typeof EVENTS.CALL_UPDATED
  | typeof EVENTS.BILL_CREATED
  | typeof EVENTS.BILL_UPDATED;

export function emitToStaff(
  io: AppSocketServer,
  event: StaffEvent,
  payload: unknown
) {
  io.to("staff").emit(event, payload);
}

export function emitToTable(
  io: AppSocketServer,
  tableId: string,
  event: TableEvent,
  payload: unknown
) {
  io.to(`table:${tableId}`).emit(event, payload);
}
