import type { CafeSettings } from "@prisma/client";
import { AppError } from "../lib/errors";
import { haversineMeters } from "../lib/geo";
import { prisma } from "../lib/prisma";
import { isWithinServiceHours } from "../lib/service-hours";

const SETTINGS_ID = 1;

export interface UpdateCafeSettingsInput {
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters: number;
  openingTime: string;
  closingTime: string;
  timezone: string;
  isGeoCheckEnabled: boolean;
}

export interface CafeSettingsRecord {
  id: number;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  openingTime: string;
  closingTime: string;
  timezone: string;
  isGeoCheckEnabled: boolean;
  updatedAt: Date | null;
  updatedById: string | null;
}

const DEFAULT_SETTINGS: CafeSettingsRecord = {
  id: SETTINGS_ID,
  latitude: null,
  longitude: null,
  radiusMeters: 50,
  openingTime: "09:00",
  closingTime: "22:00",
  timezone: "UTC",
  isGeoCheckEnabled: false,
  updatedAt: null,
  updatedById: null,
};

export interface CafeSettingsResponse {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  openingTime: string;
  closingTime: string;
  timezone: string;
  isGeoCheckEnabled: boolean;
  isOpenNow: boolean;
  updatedAt: string | null;
}

/**
 * Read the singleton settings row. If an administrator has never saved the
 * form, return the defaults without writing a row: the gate is off, so a read
 * should not require a write.
 */
export async function getCafeSettings(): Promise<CafeSettingsRecord> {
  const settings = await prisma.cafeSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  return settings ?? DEFAULT_SETTINGS;
}

export async function updateCafeSettings(
  input: UpdateCafeSettingsInput,
  updatedById?: string
): Promise<CafeSettingsRecord> {
  const data = {
    ...input,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    updatedById: updatedById ?? null,
  };

  const settings: CafeSettings = await prisma.cafeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ...data,
    },
    update: data,
  });

  return settings;
}

export function serializeCafeSettings(
  settings: CafeSettingsRecord,
  now: Date = new Date()
): CafeSettingsResponse {
  return {
    latitude: settings.latitude,
    longitude: settings.longitude,
    radiusMeters: settings.radiusMeters,
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    timezone: settings.timezone,
    isGeoCheckEnabled: settings.isGeoCheckEnabled,
    isOpenNow: isWithinServiceHours(settings, now),
    updatedAt: settings.updatedAt?.toISOString() ?? null,
  };
}

export interface GuestLocation {
  lat?: number;
  lng?: number;
}

/**
 * Enforce the guest location gate on menu reads and guest actions.
 *
 * The browser coordinates are supplied by the client and can be spoofed; this
 * is a deterrent against remote QR use, not a cryptographic proof of presence.
 * Always call it after the table number/key has been validated.
 */
export async function assertGuestAccess(
  location: GuestLocation,
  now: Date = new Date()
): Promise<void> {
  const settings = await getCafeSettings();
  if (!settings.isGeoCheckEnabled) return;

  if (!isWithinServiceHours(settings, now)) {
    throw new AppError(
      403,
      "RESTAURANT_CLOSED",
      "The café is closed right now. Please come back during opening hours.",
      {
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        timezone: settings.timezone,
      }
    );
  }

  if (settings.latitude === null || settings.longitude === null) {
    throw new AppError(
      503,
      "GEO_NOT_CONFIGURED",
      "Location verification is temporarily unavailable. Please ask a staff member."
    );
  }

  const { lat, lng } = location;
  const hasLat = typeof lat === "number";
  const hasLng = typeof lng === "number";

  if (hasLat !== hasLng) {
    throw new AppError(
      400,
      "INVALID_COORDINATES",
      "Provide both a latitude and a longitude."
    );
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new AppError(
      403,
      "GEO_REQUIRED",
      "Please allow location access so we can confirm you're at the café."
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError(
      400,
      "INVALID_COORDINATES",
      "Provide both a latitude and a longitude."
    );
  }

  const distanceMeters = haversineMeters(
    { lat, lng },
    { lat: settings.latitude, lng: settings.longitude }
  );

  if (distanceMeters > settings.radiusMeters) {
    throw new AppError(
      403,
      "OUT_OF_RANGE",
      "You're outside the café's allowed area. Please come inside and try again.",
      {
        distanceMeters: Math.round(distanceMeters),
        radiusMeters: settings.radiusMeters,
      }
    );
  }
}
