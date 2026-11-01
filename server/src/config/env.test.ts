import { describe, expect, it } from "vitest";
import { assertProductionSafety } from "./production-safety";

const safeProductionEnv: Record<string, string | undefined> = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(64),
  COOKIE_SECURE: "true",
  REQUIRE_TABLE_KEY: "true",
  TRUST_PROXY_HOPS: "1",
  DATABASE_URL: "postgresql://secure-user:StrongPass!@db.example.com:5432/cafe_qr?schema=public",
  CLIENT_ORIGIN: "https://cafe.example.com",
};

describe("assertProductionSafety", () => {
  it("accepts a safe production config", () => {
    expect(() => assertProductionSafety(safeProductionEnv)).not.toThrow();
  });

  it.each([
    ["JWT_SECRET", { JWT_SECRET: "short" }],
    ["JWT_SECRET", { JWT_SECRET: "change-me-to-a-random-string-at-least-48-characters-long" }],
    ["COOKIE_SECURE", { COOKIE_SECURE: "false" }],
    ["REQUIRE_TABLE_KEY", { REQUIRE_TABLE_KEY: "false" }],
    [
      "DATABASE_URL",
      {
        DATABASE_URL:
          "postgresql://cafe:cafe_dev_password@db.example.com:5432/cafe_qr?schema=public",
      },
    ],
    [
      "DATABASE_URL",
      {
        DATABASE_URL:
          "postgresql://cafe:cafe_dev_password@localhost:5432/cafe_qr?schema=public",
      },
    ],
    ["CLIENT_ORIGIN", { CLIENT_ORIGIN: "http://cafe.example.com" }],
    ["CLIENT_ORIGIN", { CLIENT_ORIGIN: "https://cafe.example.com/" }],
    ["CLIENT_ORIGIN", { CLIENT_ORIGIN: "https://cafe.example.com/app" }],
    ["SEED_ADMIN_EMAIL", { SEED_ADMIN_EMAIL: "admin@example.com" }],
    ["SEED_ADMIN_PASSWORD", { SEED_ADMIN_PASSWORD: "Admin123!" }],
    ["TRUST_PROXY_HOPS", { TRUST_PROXY_HOPS: undefined }],
    ["TRUST_PROXY_HOPS", { TRUST_PROXY_HOPS: "" }],
  ])("names %s when rejecting an unsafe production setting", (variable, overrides) => {
    expect(() =>
      assertProductionSafety({
        ...safeProductionEnv,
        ...overrides,
      })
    ).toThrow(new RegExp(`Production safety checks failed for: .*${variable}`));
  });

  it("allows the local cafe user when it has a non-default password", () => {
    expect(() =>
      assertProductionSafety({
        ...safeProductionEnv,
        DATABASE_URL:
          "postgresql://cafe:custom-secret@localhost:5432/cafe_qr?schema=public",
      })
    ).not.toThrow();
  });
});
