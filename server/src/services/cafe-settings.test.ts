import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("../lib/prisma", () => ({
  prisma: { cafeSettings: { findUnique } },
}));

import { assertGuestAccess } from "./cafe-settings.service";

const baseSettings = {
  id: 1,
  latitude: 31.9539,
  longitude: 35.9106,
  radiusMeters: 50,
  openingTime: "00:00",
  closingTime: "23:59",
  timezone: "UTC",
  isGeoCheckEnabled: true,
  updatedAt: new Date("2026-11-01T00:00:00.000Z"),
  updatedById: null,
};

const midday = new Date("2026-11-08T12:00:00.000Z");

describe("assertGuestAccess", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("does nothing while the gate is disabled", async () => {
    findUnique.mockResolvedValue({ ...baseSettings, isGeoCheckEnabled: false });

    await expect(
      assertGuestAccess({}, new Date("2026-11-08T18:00:00.000Z"))
    ).resolves.toBeUndefined();
  });

  it("blocks a closed café before asking for coordinates", async () => {
    findUnique.mockResolvedValue({
      ...baseSettings,
      openingTime: "09:00",
      closingTime: "17:00",
    });

    await expect(
      assertGuestAccess({}, new Date("2026-11-08T18:00:00.000Z"))
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "RESTAURANT_CLOSED",
    });
  });

  it("asks for coordinates when the gate is on", async () => {
    findUnique.mockResolvedValue(baseSettings);

    await expect(assertGuestAccess({}, midday)).rejects.toMatchObject({
      statusCode: 403,
      code: "GEO_REQUIRED",
    });
  });

  it("rejects a half-supplied coordinate pair", async () => {
    findUnique.mockResolvedValue(baseSettings);

    await expect(
      assertGuestAccess({ lat: 31.9539 }, midday)
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_COORDINATES",
    });
  });

  it("allows a customer inside the radius", async () => {
    findUnique.mockResolvedValue(baseSettings);

    await expect(
      assertGuestAccess({ lat: 31.954, lng: 35.9106 }, midday)
    ).resolves.toBeUndefined();
  });

  it("blocks a customer outside the radius and reports the distance", async () => {
    findUnique.mockResolvedValue(baseSettings);

    await expect(
      assertGuestAccess({ lat: 31.96, lng: 35.9106 }, midday)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "OUT_OF_RANGE",
      details: { radiusMeters: 50 },
    });
  });

  it("fails closed when the café location is not configured", async () => {
    findUnique.mockResolvedValue({
      ...baseSettings,
      latitude: null,
      longitude: null,
    });

    await expect(
      assertGuestAccess({ lat: 31.9539, lng: 35.9106 }, midday)
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "GEO_NOT_CONFIGURED",
    });
  });
});
