import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export type LatLng = { lat: number; lng: number };

export const DEFAULT_MAP_CENTER: LatLng = {
  lat: 10.490771409353307,
  lng: -66.95274734821183,
};

let loadPromise: Promise<typeof google.maps> | null = null;
let optionsSet = false;

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Solo en navegador'));
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (loadPromise) return loadPromise;

  if (!optionsSet) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      libraries: ['places'],
    });
    optionsSet = true;
  }

  loadPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('geocoding'),
    importLibrary('places'),
  ])
    .then(() => {
      if (!window.google?.maps?.Map) {
        throw new Error('Google Maps no inicializó correctamente');
      }
      return window.google.maps;
    })
    .catch((err: Error) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export function parseCoords(lat?: string, lng?: string): LatLng | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

export function coordsValid(lat?: string, lng?: string): boolean {
  return parseCoords(lat, lng) !== null;
}

export function mapsLink(lat: string, lng: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Escucha errores de Google Maps tras montar el mapa (p. ej. ApiTargetBlockedMapError). */
export function watchGoogleMapsAuthFailure(onFail: (message: string) => void): () => void {
  const prev = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    onFail(
      'La API key de Google Maps no permite este sitio web. Usa una key WEB (referrer HTTP), no la key de Android.'
    );
    prev?.();
  };
  return () => {
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = prev;
  };
}
