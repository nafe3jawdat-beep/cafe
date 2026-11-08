import { describe, expect, it } from "vitest";
import {
  createCallSchema,
  menuQuerySchema,
  requestBillSchema,
  updateCafeSettingsSchema,
} from "./index";

const tableReference = { tableNumber: 1, tableKey: "table-key" };

const baseSettings = {
  latitude: 31.9539,
  longitude: 35.9106,
  radiusMeters: 50,
  openingTime: "09:00",
  closingTime: "22:00",
  timezone: "Asia/Amman",
  isGeoCheckEnabled: true,
};

describe("guest coordinate pair validation", () => {
  it("coerces both coordinates", () => {
    expect(
      menuQuerySchema.parse({ key: "table-key", lat: "31.9", lng: "35.9" })
    ).toMatchObject({ lat: 31.9, lng: 35.9 });
  });

  it("allows a request without coordinates so the server can ask for them", () => {
    expect(menuQuerySchema.parse({ key: "table-key" })).toEqual({
      key: "table-key",
    });
  });

  it.each([{ lat: "31.9" }, { lng: "35.9" }])(
    "rejects a lone coordinate on every guest action: %o",
    (coordinates) => {
      expect(
        menuQuerySchema.safeParse({ key: "table-key", ...coordinates }).success
      ).toBe(false);
      expect(
        createCallSchema.safeParse({
          ...tableReference,
          type: "WAITER",
          ...coordinates,
        }).success
      ).toBe(false);
      expect(
        requestBillSchema.safeParse({ ...tableReference, ...coordinates })
          .success
      ).toBe(false);
    }
  );
});

describe("updateCafeSettingsSchema", () => {
  it("accepts a complete settings payload", () => {
    expect(updateCafeSettingsSchema.safeParse(baseSettings).success).toBe(true);
  });

  it("requires coordinates before the gate can be enabled", () => {
    const result = updateCafeSettingsSchema.safeParse({
      ...baseSettings,
      latitude: null,
      longitude: null,
    });

    expect(result.success).toBe(false);
  });

  it("allows coordinates to be cleared while the gate is off", () => {
    expect(
      updateCafeSettingsSchema.safeParse({
        ...baseSettings,
        latitude: null,
        longitude: null,
        isGeoCheckEnabled: false,
      }).success
    ).toBe(true);
  });

  it("rejects an unknown timezone", () => {
    expect(
      updateCafeSettingsSchema.safeParse({
        ...baseSettings,
        timezone: "Mars/Olympus_Mons",
      }).success
    ).toBe(false);
  });
});
