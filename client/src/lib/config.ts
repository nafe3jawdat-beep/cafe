/**
 * Single source of truth for where the backend lives.
 * Every network call (REST, Socket.IO, uploaded images) must derive its host from here.
 *
 * VITE_API_URL is a BUILD-TIME variable: Vite bakes it into the bundle when you run
 * `vite build`. Changing it in your host's dashboard has no effect until you rebuild.
 */
const rawApiUrl: unknown = import.meta.env.VITE_API_URL;
const configured = typeof rawApiUrl === "string" ? rawApiUrl.trim() : "";

// Fall back to the local backend ONLY when the variable is not provided.
// A blank value counts as "not provided": an empty host would silently turn every
// request into a relative one that hits the static host instead of the API.
export const API_ORIGIN = (configured || "http://localhost:4000").replace(
  /\/+$/,
  ""
);
export const API_BASE = `${API_ORIGIN}/api`;
export const SOCKET_URL = API_ORIGIN;
export const IS_DEV = import.meta.env.DEV;

if (import.meta.env.PROD) {
  if (!configured) {
    console.error(
      "[config] VITE_API_URL was not set when this bundle was built, so the app is " +
        "trying to reach http://localhost:4000. Set VITE_API_URL and rebuild."
    );
  } else if (!API_ORIGIN.startsWith("https://")) {
    console.warn(
      "[config] VITE_API_URL is not https; cookies and sockets may be blocked."
    );
  }
}

if (/\/api$/i.test(API_ORIGIN)) {
  console.warn(
    "[config] VITE_API_URL should be the server origin only (no /api suffix); " +
      "the client appends /api itself."
  );
}

/** Prefix backend-served files (e.g. /uploads/menu.jpg) with the API origin. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/uploads/") ? `${API_ORIGIN}${path}` : path;
}
