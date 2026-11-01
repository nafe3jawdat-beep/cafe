import { env } from "../config/env";
import { badRequest } from "../lib/errors";

const POSTGRES_INT_MAX = 2_147_483_647;

export interface OrderTotals {
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
}

export function calculateTotalsForRates(
  subtotalCents: number,
  taxRate: number,
  serviceChargeRate: number
): OrderTotals {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError("Subtotal must be a non-negative integer.");
  }

  const taxCents = Math.round(subtotalCents * taxRate);
  const serviceChargeCents = Math.round(subtotalCents * serviceChargeRate);
  const totalCents = subtotalCents + taxCents + serviceChargeCents;

  if (
    subtotalCents > POSTGRES_INT_MAX ||
    taxCents > POSTGRES_INT_MAX ||
    serviceChargeCents > POSTGRES_INT_MAX ||
    totalCents > POSTGRES_INT_MAX
  ) {
    throw badRequest("The order total exceeds the supported amount.");
  }

  return {
    subtotalCents,
    taxCents,
    serviceChargeCents,
    totalCents,
  };
}

export function calculateTotals(subtotalCents: number): OrderTotals {
  return calculateTotalsForRates(
    subtotalCents,
    env.TAX_RATE,
    env.SERVICE_CHARGE_RATE
  );
}
