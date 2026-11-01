import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  env: { TAX_RATE: 0, SERVICE_CHARGE_RATE: 0 },
}));

import { calculateTotalsForRates } from "./pricing";

describe("calculateTotalsForRates", () => {
  it("returns the subtotal when no rates are configured", () => {
    expect(calculateTotalsForRates(1234, 0, 0)).toEqual({
      subtotalCents: 1234,
      taxCents: 0,
      serviceChargeCents: 0,
      totalCents: 1234,
    });
  });

  it("calculates tax and service charge independently", () => {
    expect(calculateTotalsForRates(1000, 0.08, 0.1)).toEqual({
      subtotalCents: 1000,
      taxCents: 80,
      serviceChargeCents: 100,
      totalCents: 1180,
    });
  });

  it("rounds each component to the nearest cent", () => {
    expect(calculateTotalsForRates(999, 0.0875, 0.0333)).toEqual({
      subtotalCents: 999,
      taxCents: 87,
      serviceChargeCents: 33,
      totalCents: 1119,
    });
  });

  it("rounds half cents up", () => {
    expect(calculateTotalsForRates(1005, 0.1, 0.05)).toEqual({
      subtotalCents: 1005,
      taxCents: 101,
      serviceChargeCents: 50,
      totalCents: 1156,
    });
  });

  it("rejects invalid subtotals", () => {
    expect(() => calculateTotalsForRates(-1, 0.1, 0)).toThrow(RangeError);
    expect(() => calculateTotalsForRates(10.5, 0.1, 0)).toThrow(RangeError);
  });

  it("rejects totals that exceed PostgreSQL INTEGER capacity", () => {
    expect(() => calculateTotalsForRates(715_827_883, 1, 1)).toThrow(
      "The order total exceeds the supported amount."
    );
  });
});
