import { describe, expect, it } from "vitest";
import {
  clearSessionCookieOptions,
  sessionCookieOptions,
} from "./session";

describe("session cookie options", () => {
  it("uses SameSite=None + Secure for cross-site HTTPS deployments", () => {
    const options = sessionCookieOptions(true);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it("keeps SameSite=Lax for local HTTP development", () => {
    // SameSite=None requires Secure, which plain-HTTP localhost cannot provide.
    const options = sessionCookieOptions(false);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("clears the cookie with the same cross-site attributes", () => {
    const options = clearSessionCookieOptions(true);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    expect(options.maxAge).toBeUndefined();
  });
});
