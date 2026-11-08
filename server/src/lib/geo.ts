/**
 * Great-circle distance between two coordinates, in metres.
 *
 * This is the Haversine formula. It is accurate to well under a metre at the
 * distances a café geofence uses, and needs no external dependency.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(from: LatLng, to: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  // Clamp the value before asin to guard against tiny floating-point drift.
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}
