/**
 * Read-only end-to-end smoke test for the cafe API.
 *
 * It exercises the same routes the React client calls and prints one result
 * per endpoint. Nothing is created, updated, or deleted; the only write is the
 * login's `lastLoginAt` timestamp.
 *
 * Usage (from the repository root):
 *   npm run verify:api
 *   npm run verify:api -- --base https://cafe-backend-kmoj.onrender.com
 *
 * Credentials are read from ADMIN_EMAIL / ADMIN_PASSWORD (server/.env or the
 * shell). Prefer the environment over --password, which leaks into history.
 */
import path from "node:path";
import dotenv from "dotenv";
import { SESSION_COOKIE } from "../src/types/auth";

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
dotenv.config({ quiet: true });

type Outcome = "pass" | "warn" | "fail";

interface CheckResult {
  label: string;
  status: number | null;
  outcome: Outcome;
  note: string;
}

interface ApiResult {
  status: number | null;
  ok: boolean;
  body: unknown;
  networkError?: string;
}

function readFlag(args: string[], name: string) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function printUsage() {
  console.log(`Usage: npm run verify:api -- [options]

Options:
  --base <url>       API origin (default: API_URL or http://localhost:4000)
  --email <email>    admin email (default: ADMIN_EMAIL)
  --password <pw>    admin password (default: ADMIN_PASSWORD; prefer the env)
  --table <number>   table number for the public menu check (default: TABLE_NUMBER or 1)
  --key <key>        table QR key (default: TABLE_KEY)
  --timeout <ms>     per-request timeout (default: API_TIMEOUT_MS or 90000)

Environment variables: API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TABLE_NUMBER,
TABLE_KEY, API_TIMEOUT_MS`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exitCode = 0;
  process.exit();
}

const baseUrl = (
  readFlag(args, "base") ??
  process.env.API_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");
const email = readFlag(args, "email") ?? process.env.ADMIN_EMAIL ?? "";
const password = readFlag(args, "password") ?? process.env.ADMIN_PASSWORD ?? "";
const tableNumber =
  readFlag(args, "table") ?? process.env.TABLE_NUMBER ?? "1";
const tableKey = readFlag(args, "key") ?? process.env.TABLE_KEY ?? "";
const timeoutMs = Number(
  readFlag(args, "timeout") ?? process.env.API_TIMEOUT_MS ?? 90_000
);

if (args.includes("--password")) {
  console.warn(
    "[verify] Warning: --password may be saved in shell history; prefer ADMIN_PASSWORD."
  );
}

try {
  new URL(baseUrl);
} catch {
  console.error(`[verify] Invalid API base URL: ${baseUrl}`);
  process.exitCode = 1;
  process.exit();
}

if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
  console.error(`[verify] Invalid timeout: ${timeoutMs}`);
  process.exitCode = 1;
  process.exit();
}

const results: CheckResult[] = [];
let sessionCookie: string | null = null;

function storeSessionCookie(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""].filter(Boolean);

  for (const entry of raw) {
    const pair = entry.split(";")[0]?.trim() ?? "";
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;

    if (pair.slice(0, separator) === SESSION_COOKIE) {
      sessionCookie = pair;
    }
  }
}

async function callApi(
  pathname: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<ApiResult> {
  const headers = new Headers({ accept: "application/json" });
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.auth && sessionCookie) {
    headers.set("cookie", sessionCookie);
  }

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    storeSessionCookie(response);

    const text = await response.text();
    let body: unknown = text;
    try {
      body = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      // Keep the raw text so a non-JSON response (for example a Netlify HTML
      // page or a proxy error) is still visible in the report.
    }

    return { status: response.status, ok: response.ok, body };
  } catch (error) {
    return {
      status: null,
      ok: false,
      body: null,
      networkError: error instanceof Error ? error.message : String(error),
    };
  }
}

function describe(result: ApiResult) {
  if (result.status === null) {
    return result.networkError ?? "network error";
  }

  if (
    result.body !== null &&
    typeof result.body === "object" &&
    "error" in result.body
  ) {
    const error = (result.body as { error?: unknown }).error;
    if (error !== null && typeof error === "object") {
      const { code, message } = error as { code?: unknown; message?: unknown };
      return `${String(code ?? "ERROR")}: ${String(message ?? "")}`;
    }
  }

  if (typeof result.body === "string") {
    return result.body.slice(0, 120).replace(/\s+/g, " ");
  }

  return "";
}

function record(
  label: string,
  result: ApiResult,
  expected: number[],
  options: { warnStatuses?: number[]; hint?: string } = {}
) {
  const outcome: Outcome =
    result.status !== null && expected.includes(result.status)
      ? "pass"
      : result.status !== null &&
          options.warnStatuses?.includes(result.status)
        ? "warn"
        : "fail";

  results.push({
    label,
    status: result.status,
    outcome,
    note:
      outcome === "pass"
        ? ""
        : describe(result) || options.hint || "",
  });

  return result;
}

async function main() {
  console.log(`[verify] API: ${baseUrl}`);
  console.log(`[verify] Read-only checks; login only updates lastLoginAt.`);
  console.log("");

  record("GET /api/health", await callApi("/api/health"), [200]);

  const dbProbe = record(
    "GET /api/health/db",
    await callApi("/api/health/db"),
    [200]
  );

  if (dbProbe.status === 503) {
    console.log(
      "[verify] Database probe failed; authenticated checks will probably fail too."
    );
  }

  const menuPath =
    `/api/public/tables/${encodeURIComponent(tableNumber)}/menu` +
    (tableKey ? `?key=${encodeURIComponent(tableKey)}` : "");

  record(
    `GET /api/public/tables/${tableNumber}/menu`,
    await callApi(menuPath),
    [200],
    {
      warnStatuses: [403],
      hint: tableKey
        ? "Table key was rejected; rotate the key and retry."
        : "Set TABLE_KEY when REQUIRE_TABLE_KEY=true (enforced in production).",
    }
  );

  if (!email || !password) {
    console.log(
      "[verify] Skipping authenticated checks: set ADMIN_EMAIL / ADMIN_PASSWORD (or --email / --password)."
    );
  } else {
    const login = record(
      "POST /api/auth/login",
      await callApi("/api/auth/login", {
        method: "POST",
        body: { email, password },
      }),
      [200]
    );

    if (login.status !== 200) {
      console.log("[verify] Login failed; skipping authenticated checks.");
    } else {
      const me = record(
        "GET /api/auth/me",
        await callApi("/api/auth/me", { auth: true }),
        [200],
        {
          hint:
            "This check sends the cookie explicitly, so a pass here does not prove browser cookies work across origins.",
        }
      );

      if (me.status === 401) {
        console.log(
          "[verify] 401 after a successful login: in the browser this usually means the session cookie is blocked (SameSite=Lax across netlify.app -> onrender.com)."
        );
      }

      const today = new Date().toISOString().slice(0, 10);

      const staffChecks: Array<[string, string]> = [
        ["GET /api/staff/stats", "/api/staff/stats"],
        ["GET /api/staff/orders", "/api/staff/orders?scope=active"],
        ["GET /api/staff/calls", "/api/staff/calls?scope=open"],
        ["GET /api/staff/bills", "/api/staff/bills?scope=open"],
        [
          "GET /api/staff/finance",
          `/api/staff/finance?startDate=${today}&endDate=${today}`,
        ],
        ["GET /api/staff/menu", "/api/staff/menu"],
        ["GET /api/staff/tables", "/api/staff/tables"],
        ["GET /api/staff/debug/data", "/api/staff/debug/data"],
      ];

      const staffResults = await Promise.all(
        staffChecks.map(async ([label, pathname]) => ({
          label,
          result: await callApi(pathname, { auth: true }),
        }))
      );

      for (const { label, result } of staffResults) {
        record(label, result, [200]);
      }
    }
  }
}

function printReport() {
  const labelWidth = Math.max(...results.map((result) => result.label.length), 10);
  const rule = "-".repeat(labelWidth + 32);

  console.log("");
  console.log("Result summary");
  console.log(rule);

  for (const result of results) {
    const status = result.status === null ? "ERR" : String(result.status);
    console.log(
      `${result.outcome.toUpperCase().padEnd(4)}  ${status.padEnd(3)}  ` +
        `${result.label.padEnd(labelWidth)}  ${result.note}`
    );
  }

  const passed = results.filter((result) => result.outcome === "pass").length;
  const warned = results.filter((result) => result.outcome === "warn").length;
  const failed = results.filter((result) => result.outcome === "fail").length;

  console.log(rule);
  console.log(
    `${passed} passed, ${warned} warning(s), ${failed} failed ` +
      `(${results.length} checks).`
  );

  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .then(printReport)
  .catch((error) => {
    results.push({
      label: "verify-api",
      status: null,
      outcome: "fail",
      note: error instanceof Error ? error.message : String(error),
    });
    printReport();
  });
