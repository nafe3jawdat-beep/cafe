import type { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  allowedOrderTransitions,
  canTransitionOrderStatus,
} from "./order-status";

describe("order status pipeline", () => {
  it("allows the normal kitchen sequence", () => {
    expect(canTransitionOrderStatus("PENDING", "PREPARING")).toBe(true);
    expect(canTransitionOrderStatus("PREPARING", "READY")).toBe(true);
    expect(canTransitionOrderStatus("READY", "DELIVERED")).toBe(true);
  });

  it("allows cancellation only before delivery", () => {
    expect(canTransitionOrderStatus("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("PREPARING", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("READY", "CANCELLED")).toBe(false);
    expect(canTransitionOrderStatus("DELIVERED", "CANCELLED")).toBe(false);
  });

  it("prevents skipping, reversing, or repeating steps", () => {
    expect(canTransitionOrderStatus("PENDING", "READY")).toBe(false);
    expect(canTransitionOrderStatus("PENDING", "DELIVERED")).toBe(false);
    expect(canTransitionOrderStatus("PREPARING", "PENDING")).toBe(false);
    expect(canTransitionOrderStatus("READY", "PREPARING")).toBe(false);
    expect(canTransitionOrderStatus("DELIVERED", "DELIVERED")).toBe(false);
  });

  it("treats delivered and cancelled orders as final", () => {
    expect(allowedOrderTransitions("DELIVERED")).toEqual([]);
    expect(allowedOrderTransitions("CANCELLED")).toEqual([]);
  });

  it("has a transition table entry for every status", () => {
    const statuses: OrderStatus[] = [
      "PENDING",
      "PREPARING",
      "READY",
      "DELIVERED",
      "CANCELLED",
    ];
    for (const status of statuses) {
      expect(allowedOrderTransitions(status)).toBeDefined();
    }
  });
});
