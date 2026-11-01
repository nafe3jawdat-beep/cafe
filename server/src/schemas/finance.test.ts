import { describe, expect, it } from "vitest";
import {
  createExpenseSchema,
  financialReportQuerySchema,
} from "./index";

describe("financial report and expense schemas", () => {
  it("accepts an inclusive, valid date range", () => {
    expect(
      financialReportQuerySchema.parse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      })
    ).toEqual({ startDate: "2026-01-01", endDate: "2026-01-31" });
  });

  it.each([
    ["2026-02-30", "2026-03-01"],
    ["2026-03-02", "2026-03-01"],
  ])("rejects invalid date ranges %s – %s", (startDate, endDate) => {
    expect(() =>
      financialReportQuerySchema.parse({ startDate, endDate })
    ).toThrow();
  });

  it("trims expense descriptions and requires positive integer cents", () => {
    expect(
      createExpenseSchema.parse({
        date: "2026-10-31",
        description: "  Coffee beans  ",
        amountCents: "1250",
      })
    ).toEqual({
      date: "2026-10-31",
      description: "Coffee beans",
      amountCents: 1250,
    });

    expect(() =>
      createExpenseSchema.parse({
        date: "2026-10-31",
        description: "Beans",
        amountCents: 0,
      })
    ).toThrow();
  });
});
