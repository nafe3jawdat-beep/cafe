import { describe, expect, it } from "vitest";
import { sumBillAmount } from "./bill.service";

const amounts = (
  subtotalCents: number,
  taxCents = 0,
  serviceChargeCents = 0,
  totalCents = subtotalCents + taxCents + serviceChargeCents
) => ({ subtotalCents, taxCents, serviceChargeCents, totalCents });

describe("sumBillAmount", () => {
  it("sums bill amounts that fit PostgreSQL INTEGER", () => {
    expect(
      sumBillAmount(
        [amounts(900_000_000), amounts(900_000_000)],
        "subtotalCents"
      )
    ).toBe(1_800_000_000);
  });

  it("rejects bill amounts that exceed PostgreSQL INTEGER", () => {
    expect(() =>
      sumBillAmount(
        [amounts(1_500_000_000), amounts(1_000_000_000)],
        "subtotalCents"
      )
    ).toThrow("The table's bill exceeds the supported amount.");
  });
});
