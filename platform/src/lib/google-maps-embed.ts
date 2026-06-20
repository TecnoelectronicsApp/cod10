import type { LatLng } from './google-maps';

export { DEFAULT_MAP_CENTER, parseCoords, mapsLink } from './google-maps';
export type { LatLng };

export const MAP_ZOOM_MIN = 14;
export const MAP_ZOOM_MAX = 20;
export const MAP_EMBED_ZOOM = 18;

/** Iframe oficial de Google Maps — no requiere API key ni facturación. */
export function googleMapsEmbedUrl(lat: number, lng: number, zoom = MAP_EMBED_ZOOM): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=es&z=${zoom}&output=embed`;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, Math.round(zoom)));
}

/** Convierte arrastre en píxeles a desplazamiento lat/lng (pin fijo al centro). */
export function offsetCoordsByPixels(
  center: LatLng,
  deltaX: number,
  deltaY: number,
  zoom = MAP_EMBED_ZOOM
): LatLng {
  const scale = 2 ** zoom;
  const latRad = (center.lat * Math.PI) / 180;
  const metersPerPixel = (156543.03392 * Math.cos(latRad)) / scale;
  const dLat = (-deltaY * metersPerPixel) / 111320;
  const cosLat = Math.cos(latRad) || 1;
  const dLng = (deltaX * metersPerPixel) / (111320 * cosLat);
  return {
    lat: center.lat + dLat,
    lng: center.lng + dLng,
  };
}

function pinchDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function zoomFromPinch(
  currentZoom: number,
  startDistance: number,
  currentDistance: number
): number {
  if (startDistance < 10) return currentZoom;
  const ratio = currentDistance / startDistance;
  return clampZoom(currentZoom + Math.log2(ratio) * 1.4);
}

export { pinchDistance };
