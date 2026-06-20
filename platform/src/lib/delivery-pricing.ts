import type { LatLng } from './google-maps';

/** Punto de partida Codigo 10 (cocina / local). */
export const DELIVERY_ORIGIN: LatLng = {
  lat: 10.490771409353307,
  lng: -66.95274734821183,
};

export const DELIVERY_INCLUDED_KM = 4;
export const DELIVERY_BASE_FEE = 3;
export const DELIVERY_EXTRA_PER_KM = 0.5;

export function haversineKm(from: LatLng, to: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const la1 = toRad(from.lat);
  const la2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Hasta 4 km → $3; cada km adicional → +$0.50 */
export function calcDeliveryFeeKm(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return DELIVERY_BASE_FEE;
  if (distanceKm <= DELIVERY_INCLUDED_KM) return DELIVERY_BASE_FEE;
  const extra = (distanceKm - DELIVERY_INCLUDED_KM) * DELIVERY_EXTRA_PER_KM;
  return Math.round((DELIVERY_BASE_FEE + extra) * 100) / 100;
}

export function calcDeliveryFeeFromCoords(
  customerLat: string | number | undefined,
  customerLng: string | number | undefined
): { fee: number; distanceKm: number | null } {
  const lat = Number(customerLat);
  const lng = Number(customerLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return { fee: DELIVERY_BASE_FEE, distanceKm: null };
  }
  const distanceKm = haversineKm(DELIVERY_ORIGIN, { lat, lng });
  return {
    fee: calcDeliveryFeeKm(distanceKm),
    distanceKm: Math.round(distanceKm * 100) / 100,
  };
}
