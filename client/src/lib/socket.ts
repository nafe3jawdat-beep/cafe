import { io, type Socket } from "socket.io-client";
import type {
  Bill,
  CallStatus,
  Order,
  OrderStatus,
  StaffCall,
} from "../types";
import { IS_DEV, SOCKET_URL } from "./config";

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
  const socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    // Without this, a failed WebSocket handshake (corporate proxy, captive Wi-Fi)
    // never falls back to long-polling.
    tryAllTransports: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // A sleeping Render instance can need longer than the 20s default to wake up.
    timeout: 30_000,
  });

  socket.on("connect", () => {
    if (IS_DEV) console.info(`[socket] Connected (${socket.id ?? "connected"}).`);
  });
  socket.on("disconnect", (reason) => {
    console.warn(`[socket] Disconnected: ${reason}.`);
  });
  socket.on("connect_error", (error) => {
    console.error(`[socket] Connection failed: ${error.message}.`);
  });
  socket.io.on("reconnect_attempt", (attempt) => {
    if (IS_DEV) console.info(`[socket] Reconnection attempt ${attempt}.`);
  });

  return socket;
}

export type { Order, OrderStatus, StaffCall, CallStatus };
