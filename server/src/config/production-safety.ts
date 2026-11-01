const JWT_SECRET_EXAMPLE =
  "change-me-to-a-random-string-at-least-48-characters-long";

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
    throw new Error(
      `Production safety checks failed for: ${issues.join(", ")}.`
    );
  }
}
