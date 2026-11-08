import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite/ESM can break Leaflet's default marker icon paths; set them explicitly.
const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

const DEFAULT_CENTER: [number, number] = [31.9539, 35.9106];

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  className?: string;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function MapEvents({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(
        roundCoordinate(event.latlng.lat),
        roundCoordinate(event.latlng.lng)
      );
    },
  });
  return null;
}

function RecenterOnChange({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    const current = map.getCenter();
    const distance = current.distanceTo([latitude, longitude]);
    // Avoid fighting the user's drag/zoom; only recenter for meaningful jumps
    // (e.g. "Use my current location" or manual coordinate entry).
    if (distance > 25) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16), {
        animate: true,
      });
    }
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  className,
}: LocationPickerMapProps) {
  const hasPosition = latitude !== null && longitude !== null;
  const center = useMemo<[number, number]>(
    () => (hasPosition ? [latitude, longitude] : DEFAULT_CENTER),
    // Only use the initial center from first valid coordinates/default.
    // Subsequent moves are handled by RecenterOnChange and marker drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const position = hasPosition ? ([latitude, longitude] as [number, number]) : null;

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={hasPosition ? 17 : 13}
        scrollWheelZoom
        className="h-64 w-full rounded-2xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onChange={onChange} />
        <RecenterOnChange latitude={latitude} longitude={longitude} />
        {position ? (
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target as L.Marker;
                const latlng = marker.getLatLng();
                onChange(
                  roundCoordinate(latlng.lat),
                  roundCoordinate(latlng.lng)
                );
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
