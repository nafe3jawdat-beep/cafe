import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  env: { RATE_LIMIT_PER_IP: 60 },
}));

import { getRateLimitKey } from "./rate-limit";

describe("getRateLimitKey", () => {
  it("keeps the same per-IP key when the table number is invalid", () => {
    const first = getRateLimitKey({ body: { tableNumber: "bad" }, ip: "203.0.113.7" } as any);
    const second = getRateLimitKey({ body: { tableNumber: 0 }, ip: "203.0.113.7" } as any);

    expect(first).toBe(second);
  });

  it("changes the table-scoped key when the table number rotates", () => {
    const ip = "203.0.113.7";
    const first = getRateLimitKey({ body: { tableNumber: 1 }, ip } as any);
    const second = getRateLimitKey({ body: { tableNumber: 2 }, ip } as any);

    expect(first).not.toBe(second);
    expect(first).toContain("table:1");
    expect(second).toContain("table:2");
  });
});
