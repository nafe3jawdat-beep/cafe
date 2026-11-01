import type { OrderStatus } from "@prisma/client";

/**
 * The kitchen pipeline is intentionally linear. Managers may cancel an order
 * before it reaches the kitchen, but delivered and cancelled orders are final.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function allowedOrderTransitions(
  status: OrderStatus
): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status];
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
