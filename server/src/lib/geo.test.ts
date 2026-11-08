import { describe, expect, it } from "vitest";
import { haversineMeters } from "./geo";

describe("haversineMeters", () => {
  it("returns zero for the same point", () => {
    expect(
      haversineMeters({ lat: 31.9539, lng: 35.9106 }, { lat: 31.9539, lng: 35.9106 })
    ).toBe(0);
  });

  it("measures a café-scale distance", () => {
    // 0.001° of latitude is roughly 111 metres.
    const distance = haversineMeters(
      { lat: 31.9539, lng: 35.9106 },
      { lat: 31.9549, lng: 35.9106 }
    );

    expect(distance).toBeGreaterThan(105);
    expect(distance).toBeLessThan(118);
  });

  it("is symmetric", () => {
    const a = { lat: 31.9539, lng: 35.9106 };
    const b = { lat: 31.9601, lng: 35.9202 };

    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("handles the antimeridian", () => {
    const distance = haversineMeters(
      { lat: 0, lng: 179.999 },
      { lat: 0, lng: -179.999 }
    );

    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(250);
  });
});
