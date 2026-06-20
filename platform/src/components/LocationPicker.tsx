'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  DEFAULT_MAP_CENTER,
  LatLng,
  loadGoogleMaps,
  mapsLink,
  parseCoords,
  watchGoogleMapsAuthFailure,
} from '@/lib/google-maps';

const GoogleMapsEmbedView = dynamic(() => import('@/components/GoogleMapsEmbedView'), {
  ssr: false,
});

type Props = {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string, formattedAddress?: string) => void;
  onAddressSuggestion?: (line: string) => void;
};

type MapMode = 'loading' | 'interactive' | 'embed';

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressSuggestion,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const geoAttempted = useRef(false);

  const [mode, setMode] = useState<MapMode>('loading');
  const [geoError, setGeoError] = useState('');
  const [locating, setLocating] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const forceEmbed = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ONLY === 'true';

  const applyPositionJs = useCallback(
    (pos: LatLng, reverseGeocode = true) => {
      onChange(String(pos.lat), String(pos.lng));
      if (mapInstance.current && markerRef.current) {
        mapInstance.current.panTo(pos);
        markerRef.current.setPosition(pos);
      }
      if (reverseGeocode && geocoderRef.current) {
        geocoderRef.current.geocode({ location: pos }, (results, geoStatus) => {
          if (geoStatus === 'OK' && results?.[0]?.formatted_address) {
            onAddressSuggestion?.(results[0].formatted_address);
          }
        });
      }
    },
    [onChange, onAddressSuggestion]
  );

  const applyPositionEmbed = useCallback(
    (pos: LatLng) => {
      onChange(String(pos.lat), String(pos.lng));
    },
    [onChange]
  );

  const switchToEmbed = useCallback(() => {
    mapInstance.current = null;
    markerRef.current = null;
    geocoderRef.current = null;
    setMode('embed');
    const initial = parseCoords(latitude, longitude) || DEFAULT_MAP_CENTER;
    if (!parseCoords(latitude, longitude)) {
      applyPositionEmbed(initial);
    }
  }, [latitude, longitude, applyPositionEmbed]);

  const tryGeolocation = useCallback(
    (silent = false) => {
      setGeoError('');
      if (!navigator.geolocation) {
        if (!silent) setGeoError('Tu navegador no soporta geolocalización');
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (mode === 'interactive') {
            applyPositionJs(next);
          } else {
            applyPositionEmbed(next);
          }
        },
        (err) => {
          setLocating(false);
          if (silent) return;
          setGeoError(
            err.code === 1
              ? 'Permiso denegado. Usa las flechas o activa la ubicación en el navegador.'
              : 'No se pudo detectar tu ubicación. Ajusta el punto con las flechas.'
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    },
    [mode, applyPositionJs, applyPositionEmbed]
  );

  useEffect(() => {
    if (forceEmbed || !apiKey) {
      switchToEmbed();
      if (!geoAttempted.current) {
        geoAttempted.current = true;
        window.setTimeout(() => tryGeolocation(true), 300);
      }
      return;
    }

    if (!mapRef.current || mapInstance.current) return;

    let cancelled = false;
    const unwatchAuth = watchGoogleMapsAuthFailure(() => {
      if (cancelled) return;
      switchToEmbed();
    });

    const mount = (maps: typeof google.maps) => {
      if (!mapRef.current || mapInstance.current || cancelled) return;

      const initial = parseCoords(latitude, longitude) || DEFAULT_MAP_CENTER;

      const map = new maps.Map(mapRef.current, {
        center: initial,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      const marker = new maps.Marker({
        map,
        position: initial,
        draggable: true,
        title: 'Arrastra para ajustar la entrega',
      });

      geocoderRef.current = new maps.Geocoder();
      mapInstance.current = map;
      markerRef.current = marker;

      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (!p) return;
        applyPositionJs({ lat: p.lat(), lng: p.lng() });
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        applyPositionJs({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });

      window.setTimeout(() => {
        if (!mapInstance.current) return;
        maps.event.trigger(mapInstance.current, 'resize');
        mapInstance.current.setCenter(initial);
        if (!parseCoords(latitude, longitude)) {
          applyPositionJs(initial, false);
        }
      }, 150);

      setMode('interactive');

      if (!geoAttempted.current) {
        geoAttempted.current = true;
        tryGeolocation(true);
      }
    };

    const boot = async () => {
      try {
        const maps = await loadGoogleMaps(apiKey);
        mount(maps);
      } catch {
        if (!cancelled) switchToEmbed();
      }
    };

    void boot();

    const timeout = window.setTimeout(() => {
      if (!cancelled && !mapInstance.current) {
        switchToEmbed();
      }
    }, 20000);

    return () => {
      cancelled = true;
      unwatchAuth();
      window.clearTimeout(timeout);
      mapInstance.current = null;
      markerRef.current = null;
      geocoderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, forceEmbed]);

  useEffect(() => {
    if (mode !== 'interactive') return;
    const pos = parseCoords(latitude, longitude);
    if (!pos || !markerRef.current || !mapInstance.current) return;
    markerRef.current.setPosition(pos);
    mapInstance.current.panTo(pos);
  }, [latitude, longitude, mode]);

  useEffect(() => {
    if (mode !== 'embed' || geoAttempted.current) return;
    geoAttempted.current = true;
    window.setTimeout(() => tryGeolocation(true), 300);
  }, [mode, tryGeolocation]);

  const hasCoords = parseCoords(latitude, longitude);

  if (mode === 'embed') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-gray-700">
            Ubicación exacta en mapa
          </label>
          <button
            type="button"
            onClick={() => tryGeolocation(false)}
            disabled={locating}
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            {locating ? 'Localizando…' : '📍 Usar mi ubicación'}
          </button>
        </div>
        <GoogleMapsEmbedView
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => onChange(lat, lng)}
          geoError={geoError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">
          Ubicación exacta en mapa
        </label>
        <button
          type="button"
          onClick={() => tryGeolocation(false)}
          disabled={locating || mode === 'loading'}
          className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
        >
          {locating ? 'Localizando…' : '📍 Usar mi ubicación'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Mantén pulsado y arrastra el mapa, o usa <strong>Mi ubicación</strong>.
      </p>

      <div className="relative z-0 h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        {mode === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 text-sm text-gray-500">
            Cargando Google Maps…
          </div>
        )}
        <div ref={mapRef} className="h-full w-full min-h-[288px]" />
      </div>

      {hasCoords && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span>
            📌 {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
          </span>
          <a
            href={mapsLink(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline hover:text-blue-800"
          >
            Ver en Google Maps
          </a>
        </div>
      )}

      {geoError && <p className="text-xs text-amber-600">{geoError}</p>}
    </div>
  );
}
