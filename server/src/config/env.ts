import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { assertProductionSafety } from "./production-safety";

export { assertProductionSafety } from "./production-safety";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const booleanString = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  COOKIE_SECURE: booleanString("false"),
  REQUIRE_TABLE_KEY: booleanString("false"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  CURRENCY: z.string().min(3).max(3).default("USD"),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  SERVICE_CHARGE_RATE: z.coerce.number().min(0).max(1).default(0),
  UPLOAD_DIR: z.string().trim().min(1).optional(),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@cafe.local"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
  RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

if (isProduction) {
  try {
    assertProductionSafety(process.env);
  } catch (error) {
    console.error("[env] Production startup guard failed.");
    console.error(
      error instanceof Error
        ? error.message
        : "Unknown production validation error."
    );
    process.exit(1);
  }
}
