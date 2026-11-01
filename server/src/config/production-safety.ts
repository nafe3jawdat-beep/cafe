const JWT_SECRET_EXAMPLE =
  "super_secret_jwt_key_cafe_2026_production_very_long_secure_token_xyz998877ؤ";

function isLocalDatabaseWithDefaultCredentials(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    const isLocalHost = [
      "localhost",
      "127.0.0.1",
      "::1",
      "[::1]",
    ].includes(url.hostname.toLowerCase());
    return (
      isLocalHost &&
      url.username === "cafe" &&
      decodeURIComponent(url.password) === "cafe_dev_password"
    );
  } catch {
    return false;
  }
}

export function assertProductionSafety(
  rawEnv: Record<string, string | undefined>
) {
  if (rawEnv.NODE_ENV !== "production") return;

  const issues: string[] = [];
  const jwtSecret = rawEnv.JWT_SECRET ?? "";
  const databaseUrl = rawEnv.DATABASE_URL ?? "";
  const clientOrigin = rawEnv.CLIENT_ORIGIN ?? "";
  let clientOriginHasPath = true;
  try {
    const parsedClientOrigin = new URL(clientOrigin);
    clientOriginHasPath =
      parsedClientOrigin.pathname !== "/" || clientOrigin.endsWith("/");
  } catch {
    clientOriginHasPath = true;
  }

  if (
    jwtSecret.length < 48 ||
    jwtSecret.includes("change-me") ||
    jwtSecret === JWT_SECRET_EXAMPLE
  ) {
    issues.push("JWT_SECRET");
  }

  if (rawEnv.COOKIE_SECURE !== "true") {
    issues.push("COOKIE_SECURE");
  }

  if (rawEnv.REQUIRE_TABLE_KEY !== "true") {
    issues.push("REQUIRE_TABLE_KEY");
  }

  if (
    databaseUrl.includes("cafe_dev_password") ||
    isLocalDatabaseWithDefaultCredentials(databaseUrl)
  ) {
    issues.push("DATABASE_URL");
  }

  if (!clientOrigin.startsWith("https://") || clientOriginHasPath) {
    issues.push("CLIENT_ORIGIN");
  }

  if (rawEnv.SEED_ADMIN_EMAIL !== undefined) {
    issues.push("SEED_ADMIN_EMAIL");
  }

  if (rawEnv.SEED_ADMIN_PASSWORD !== undefined) {
    issues.push("SEED_ADMIN_PASSWORD");
  }

  if (
    rawEnv.TRUST_PROXY_HOPS === undefined ||
    rawEnv.TRUST_PROXY_HOPS.trim() === ""
  ) {
    issues.push("TRUST_PROXY_HOPS");
  }

  if (issues.length > 0) {
    const hints: string[] = [
      `Production safety checks failed for: ${issues.join(", ")}.`,
      "Update these variables in the hosting dashboard, then redeploy.",
    ];

    if (
      issues.includes("SEED_ADMIN_EMAIL") ||
      issues.includes("SEED_ADMIN_PASSWORD")
    ) {
      hints.push(
        "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be removed from production. Create the administrator with `npm run admin:create` instead."
      );
    }

    throw new Error(hints.join("\n"));
  }
}
