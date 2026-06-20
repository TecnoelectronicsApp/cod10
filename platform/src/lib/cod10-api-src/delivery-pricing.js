/** Punto de partida Codigo 10 — sincronizado con platform/src/lib/delivery-pricing.ts */
const DELIVERY_ORIGIN = { lat: 10.490771409353307, lng: -66.95274734821183 };
const DELIVERY_INCLUDED_KM = 4;
const DELIVERY_BASE_FEE = 3;
const DELIVERY_EXTRA_PER_KM = 0.5;

function haversineKm(from, to) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const la1 = toRad(from.lat);
  const la2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function calcDeliveryFeeKm(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return DELIVERY_BASE_FEE;
  if (distanceKm <= DELIVERY_INCLUDED_KM) return DELIVERY_BASE_FEE;
  const extra = (distanceKm - DELIVERY_INCLUDED_KM) * DELIVERY_EXTRA_PER_KM;
  return Math.round((DELIVERY_BASE_FEE + extra) * 100) / 100;
}

function calcDeliveryFeeFromAddress(address) {
  if (String(address?.label || '').toLowerCase() === 'pickup') {
    return 0;
  }
  const lat = Number(address?.latitude);
  const lng = Number(address?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return DELIVERY_BASE_FEE;
  }
  return calcDeliveryFeeKm(haversineKm(DELIVERY_ORIGIN, { lat, lng }));
}

module.exports = {
  DELIVERY_ORIGIN,
  calcDeliveryFeeFromAddress,
  calcDeliveryFeeKm,
  haversineKm,
};
