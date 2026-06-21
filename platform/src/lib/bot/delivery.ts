import {
  calcDeliveryFeeFromCoords,
  calcDeliveryFeeKm,
  DELIVERY_BASE_FEE,
  DELIVERY_EXTRA_PER_KM,
  DELIVERY_INCLUDED_KM,
  DELIVERY_ORIGIN,
  haversineKm,
} from '../delivery-pricing';

export type DeliveryEstimate = {
  fee: number;
  distanceKm: number;
  source: 'coords' | 'geocode' | 'text_coords';
};

export function buildDeliveryRulesText(currencySymbol = '$'): string {
  return [
    '=== DELIVERY (calculado por distancia) ===',
    `Local Codigo 10: ${DELIVERY_ORIGIN.lat}, ${DELIVERY_ORIGIN.lng}`,
    `Regla: ${currencySymbol}${DELIVERY_BASE_FEE} hasta ${DELIVERY_INCLUDED_KM} km; +${currencySymbol}${DELIVERY_EXTRA_PER_KM} por km adicional.`,
    'Retiro en local (pickup): sin costo de envío.',
    'Para estimar: pide dirección, ubicación de WhatsApp o enlace de Google Maps.',
  ].join('\n');
}

/** Extrae lat/lng de texto, links de Google Maps o "10.49, -66.95" */
export function parseCoordsFromText(text: string): { lat: number; lng: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const atMatch = trimmed.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  const pairMatch = trimmed.match(/(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (pairMatch) {
    const lat = Number(pairMatch[1]);
    const lng = Number(pairMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || !address.trim()) return null;

  const params = new URLSearchParams({
    address: address.trim(),
    key,
    region: 've',
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (loc?.lat !== undefined && loc?.lng !== undefined && isValidCoord(loc.lat, loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch {
    /* geocode opcional */
  }
  return null;
}

export async function estimateDelivery(opts: {
  text?: string;
  lat?: number;
  lng?: number;
  address?: string;
}): Promise<DeliveryEstimate | null> {
  if (opts.lat !== undefined && opts.lng !== undefined && isValidCoord(opts.lat, opts.lng)) {
    const distanceKm = Math.round(haversineKm(DELIVERY_ORIGIN, { lat: opts.lat, lng: opts.lng }) * 100) / 100;
    return {
      fee: calcDeliveryFeeKm(distanceKm),
      distanceKm,
      source: 'coords',
    };
  }

  const fromText = opts.text ? parseCoordsFromText(opts.text) : null;
  if (fromText) {
    const distanceKm = Math.round(haversineKm(DELIVERY_ORIGIN, fromText) * 100) / 100;
    return {
      fee: calcDeliveryFeeKm(distanceKm),
      distanceKm,
      source: 'text_coords',
    };
  }

  const address = opts.address?.trim() || extractAddressCandidate(opts.text || '');
  if (address) {
    const geo = await geocodeAddress(address);
    if (geo) {
      const distanceKm = Math.round(haversineKm(DELIVERY_ORIGIN, geo) * 100) / 100;
      return {
        fee: calcDeliveryFeeKm(distanceKm),
        distanceKm,
        source: 'geocode',
      };
    }
  }

  return null;
}

/** Intenta extraer dirección cuando el cliente escribe "envíame a..." */
function extractAddressCandidate(text: string): string | null {
  const patterns = [
    /(?:env[ií]a(?:me|r)?|mandar|llevar|entregar)\s+(?:a|en|para)\s+(.+)/i,
    /(?:vivo|estoy|ubicado|direcci[oó]n)\s+(?:en|por)\s+(.+)/i,
    /(?:a\s+d[oó]nde:\s*)(.+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim().slice(0, 200);
  }
  return null;
}

export function formatDeliveryEstimate(estimate: DeliveryEstimate, currencySymbol = '$'): string {
  return `Delivery estimado: ~${currencySymbol}${estimate.fee.toFixed(2)} (${estimate.distanceKm} km desde el local)`;
}

export function estimateFromCoords(
  lat: number | string | undefined,
  lng: number | string | undefined,
): DeliveryEstimate | null {
  const result = calcDeliveryFeeFromCoords(lat, lng);
  if (result.distanceKm === null) return null;
  return {
    fee: result.fee,
    distanceKm: result.distanceKm,
    source: 'coords',
  };
}
