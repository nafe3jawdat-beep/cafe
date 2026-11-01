export const EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  CALL_CREATED: "call:created",
  CALL_UPDATED: "call:updated",
  BILL_CREATED: "bill:created",
  BILL_UPDATED: "bill:updated",
  MENU_UPDATED: "menu:updated",
  TABLE_JOIN: "table:join",
  STAFF_JOIN: "staff:join",
  CONNECTED: "connected",
} as const;

export type OrderEventPayload = {
  id: string;
  orderNumber: number;
  tableId: string;
  table?: { number: number; name: string | null };
  status: string;
  totalCents: number;
  createdAt: string | Date;
  [key: string]: unknown;
};

export type CallEventPayload = {
  id: string;
  tableId: string;
  type: string;
  status: string;
  table?: { number: number; name: string | null };
  [key: string]: unknown;
};

export type BillEventPayload = {
  id: string;
  tableId: string;
  status: string;
  totalCents: number;
  table?: { number: number; name: string | null };
  [key: string]: unknown;
};

export type MenuEventPayload = {
  action: "created" | "updated" | "deleted";
  itemId?: string;
  categoryId?: string;
};

export interface ServerToClientEvents {
  [EVENTS.ORDER_CREATED]: (order: OrderEventPayload) => void;
  [EVENTS.ORDER_UPDATED]: (order: OrderEventPayload) => void;
  [EVENTS.CALL_CREATED]: (call: CallEventPayload) => void;
  [EVENTS.CALL_UPDATED]: (call: CallEventPayload) => void;
  [EVENTS.BILL_CREATED]: (bill: BillEventPayload) => void;
  [EVENTS.BILL_UPDATED]: (bill: BillEventPayload) => void;
  [EVENTS.MENU_UPDATED]: (menu: MenuEventPayload) => void;
}

export interface ClientToServerEvents {
  [EVENTS.TABLE_JOIN]: (
    payload: { tableNumber: number; tableKey?: string },
    callback?: (response: { ok: boolean; error?: string }) => void
  ) => void;
  [EVENTS.STAFF_JOIN]: (
    callback?: (response: { ok: boolean; error?: string }) => void
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  staff?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tableId?: string;
  tableNumber?: number;
}
