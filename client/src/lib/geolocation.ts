import { ApiError } from "./api";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationErrorCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout";

export class LocationError extends Error {
  readonly code: LocationErrorCode;

  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.name = "LocationError";
    this.code = code;
  }
}

const CACHE_MS = 60_000;
let cached: { coordinates: Coordinates; at: number } | null = null;

/** Last known position, without prompting the browser. */
export function peekCachedCoordinates(maxAgeMs = CACHE_MS): Coordinates | null {
  if (!cached) return null;
  if (Date.now() - cached.at > maxAgeMs) return null;
  return cached.coordinates;
}

export function clearCachedCoordinates() {
  cached = null;
}

export interface GetCoordinatesOptions {
  /** Ignore the in-memory cache and ask the browser for a fresh fix. */
  force?: boolean;
  timeoutMs?: number;
  /** Maximum age of the cached position that may be reused. */
  maxAgeMs?: number;
}

export function getCurrentCoordinates(
  options: GetCoordinatesOptions = {}
): Promise<Coordinates> {
  const { force = false, timeoutMs = 10_000, maxAgeMs = 30_000 } = options;

  if (!force) {
    const known = peekCachedCoordinates(maxAgeMs);
    if (known) return Promise.resolve(known);
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new LocationError(
        "unsupported",
        "This browser can't share your location."
      )
    );
  }

  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return Promise.reject(
      new LocationError(
        "unsupported",
        "Location sharing needs a secure HTTPS connection."
      )
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        cached = { coordinates, at: Date.now() };
        resolve(coordinates);
      },
      (error) => {
        // 1 = PERMISSION_DENIED, 3 = TIMEOUT. Anything else is unavailable.
        const code: LocationErrorCode =
          error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable";

        reject(
          new LocationError(
            code,
            code === "denied"
              ? "Location permission was denied."
              : code === "timeout"
                ? "Getting your location took too long."
                : "We couldn't read your location."
          )
        );
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: force ? 0 : maxAgeMs,
      }
    );
  });
}

/**
 * Run a guest action with coordinates. If the server says the location gate is
 * on ({ code: "GEO_REQUIRED" }), ask the browser for a fresh fix and retry once.
 *
 * Actions first try the cached position, so a guest who just loaded the menu
 * does not get another permission prompt or an extra round-trip. When the gate
 * is disabled the server never asks for coordinates, so this never prompts.
 */
export async function withLocationRetry<T>(
  action: (coordinates?: Coordinates) => Promise<T>
): Promise<T> {
  const known = peekCachedCoordinates();

  try {
    return await action(known ?? undefined);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "GEO_REQUIRED") {
      throw error;
    }
  }

  let coordinates: Coordinates;
  try {
    coordinates = await getCurrentCoordinates({ force: true, timeoutMs: 20_000 });
  } catch (error) {
    if (error instanceof LocationError && error.code === "unsupported") {
      throw new Error(
        "This browser can't share your location. Please ask a staff member for help."
      );
    }
    if (error instanceof LocationError && error.code === "denied") {
      throw new Error(
        "Location access is required. Allow it in your browser, then try again."
      );
    }
    throw new Error(
      "We couldn't read your location. Make sure location services are on, then try again."
    );
  }

  return action(coordinates);
}
