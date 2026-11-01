import { io, type Socket } from "socket.io-client";
import type {
  Bill,
  CallStatus,
  Order,
  OrderStatus,
  StaffCall,
} from "../types";

const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;

export interface MenuEvent {
  action: "created" | "updated" | "deleted";
  itemId?: string;
  categoryId?: string;
}

export interface ServerEvents {
  "order:created": (order: Order) => void;
  "order:updated": (order: Order) => void;
  "call:created": (call: StaffCall) => void;
  "call:updated": (call: StaffCall) => void;
  "bill:created": (bill: Bill) => void;
  "bill:updated": (bill: Bill) => void;
  "menu:updated": (menu: MenuEvent) => void;
}

export interface ClientEvents {
  "table:join": (
    payload: { tableNumber: number; tableKey?: string },
    callback?: (response: { ok: boolean; error?: string }) => void
  ) => void;
  "staff:join": (
    callback?: (response: { ok: boolean; error?: string }) => void
  ) => void;
}

export type AppSocket = Socket<ServerEvents, ClientEvents>;

export function createSocket(): AppSocket {
  return io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
}

export type { Order, OrderStatus, StaffCall, CallStatus };
