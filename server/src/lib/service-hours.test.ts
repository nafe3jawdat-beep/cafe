import { describe, expect, it } from "vitest";
import {
  isWithinServiceHours,
  minutesInTimeZone,
  parseTimeToMinutes,
} from "./service-hours";

describe("service hours", () => {
  it("parses HH:mm values", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("9:00")).toBeNull();
  });

  it("reads the wall clock in the café timezone", () => {
    const now = new Date("2026-11-08T06:30:00.000Z");
    expect(minutesInTimeZone(now, "Asia/Amman")).toBe(9 * 60 + 30);
    expect(minutesInTimeZone(now, "UTC")).toBe(6 * 60 + 30);
  });

  it("allows a normal daytime window", () => {
    const hours = {
      openingTime: "09:00",
      closingTime: "17:00",
      timezone: "Asia/Amman",
    };

    expect(
      isWithinServiceHours(hours, new Date("2026-11-08T06:30:00.000Z"))
    ).toBe(true); // 09:30 local
    expect(
      isWithinServiceHours(hours, new Date("2026-11-08T14:00:00.000Z"))
    ).toBe(false); // 17:00 local, closing is exclusive
  });

  it("supports an overnight window", () => {
    const hours = {
      openingTime: "18:00",
      closingTime: "02:00",
      timezone: "Asia/Amman",
    };

    expect(
      isWithinServiceHours(hours, new Date("2026-11-08T20:00:00.000Z"))
    ).toBe(true); // 23:00 local
    expect(
      isWithinServiceHours(hours, new Date("2026-11-08T22:30:00.000Z"))
    ).toBe(true); // 01:30 local the next day
    expect(
      isWithinServiceHours(hours, new Date("2026-11-08T09:00:00.000Z"))
    ).toBe(false); // 12:00 local
  });

  it("treats equal opening and closing times as 24-hour service", () => {
    expect(
      isWithinServiceHours(
        { openingTime: "00:00", closingTime: "00:00", timezone: "UTC" },
        new Date("2026-11-08T03:00:00.000Z")
      )
    ).toBe(true);
  });

  it("fails open on invalid stored times", () => {
    expect(
      isWithinServiceHours(
        { openingTime: "nope", closingTime: "17:00", timezone: "UTC" },
        new Date("2026-11-08T03:00:00.000Z")
      )
    ).toBe(true);
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(
      isWithinServiceHours(
        {
          openingTime: "09:00",
          closingTime: "17:00",
          timezone: "Not/AZone",
        },
        new Date("2026-11-08T12:00:00.000Z")
      )
    ).toBe(true);
  });
});
