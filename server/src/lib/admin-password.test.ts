import { describe, expect, it } from "vitest";
import { validateAdminPassword } from "./admin-password";

describe("validateAdminPassword", () => {
  it("accepts a strong admin password", () => {
    expect(validateAdminPassword("CafeStrong!Pass2024")).toEqual({ valid: true });
  });

  it("rejects the known default admin password", () => {
    expect(validateAdminPassword("Admin123!")).toEqual({
      valid: false,
      reason: "Use a different password; Admin123! is not allowed.",
    });
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(validateAdminPassword("Short1!")).toMatchObject({ valid: false });
  });

  it("rejects passwords with fewer than 3 character classes", () => {
    expect(validateAdminPassword("onlylowercase123")).toMatchObject({ valid: false });
  });
});
