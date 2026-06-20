'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampZoom,
  DEFAULT_MAP_CENTER,
  googleMapsEmbedUrl,
  MAP_EMBED_ZOOM,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  mapsLink,
  offsetCoordsByPixels,
  parseCoords,
  pinchDistance,
  zoomFromPinch,
} from '@/lib/google-maps-embed';

type Props = {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  geoError: string;
};

export default function GoogleMapsEmbedView({
  latitude,
  longitude,
  onChange,
  geoError,
}: Props) {
  const [zoom, setZoom] = useState(MAP_EMBED_ZOOM);
  const [dragPx, setDragPx] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const totalDrag = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  const commitDragRef = useRef<() => void>(() => {});

  zoomRef.current = zoom;

  const basePos = parseCoords(latitude, longitude) || DEFAULT_MAP_CENTER;

  const commitDrag = useCallback(() => {
    const { x, y } = totalDrag.current;
    if (x !== 0 || y !== 0) {
      const next = offsetCoordsByPixels(basePos, x, y, zoomRef.current);
      onChange(String(next.lat), String(next.lng));
    }
    totalDrag.current = { x: 0, y: 0 };
    setDragPx({ x: 0, y: 0 });
    draggingRef.current = false;
    setDragging(false);
    lastPoint.current = null;
    pointers.current.clear();
    pinchStart.current = null;
  }, [basePos, onChange]);

  commitDragRef.current = commitDrag;

  const changeZoom = useCallback(
    (next: number) => {
      commitDrag();
      setZoom(clampZoom(next));
    },
    [commitDrag]
  );

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      commitDragRef.current();
      const delta = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => clampZoom(z + delta));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const syncPointers = (e: React.PointerEvent<HTMLDivElement>, add: boolean) => {
    if (add) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    } else {
      pointers.current.delete(e.pointerId);
    }

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinchStart.current = { distance: pinchDistance(pts[0], pts[1]), zoom };
      draggingRef.current = false;
      lastPoint.current = null;
    } else {
      pinchStart.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    syncPointers(e, true);

    if (pointers.current.size === 1) {
      lastPoint.current = { x: e.clientX, y: e.clientY };
      draggingRef.current = true;
      setDragging(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const pts = Array.from(pointers.current.values());
      if (pts.length >= 2) {
        const dist = pinchDistance(pts[0], pts[1]);
        setZoom(zoomFromPinch(pinchStart.current.zoom, pinchStart.current.distance, dist));
      }
      return;
    }

    if (!draggingRef.current || !lastPoint.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    totalDrag.current = {
      x: totalDrag.current.x + dx,
      y: totalDrag.current.y + dy,
    };
    setDragPx({ x: totalDrag.current.x, y: totalDrag.current.y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    syncPointers(e, false);

    if (pointers.current.size === 0) {
      commitDrag();
    } else if (pointers.current.size === 1) {
      const remaining = Array.from(pointers.current.values())[0];
      lastPoint.current = remaining;
      draggingRef.current = true;
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    syncPointers(e, false);
    if (pointers.current.size === 0) commitDrag();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        <strong>Arrastra</strong> el mapa, <strong>pellizca</strong> o usa <strong>+ / −</strong> para
        acercar. Deja el pin rojo en tu puerta. También <strong>Mi ubicación</strong>.
      </p>

      <div className="relative h-80 w-full select-none overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
        <div
          className="absolute inset-0 h-[calc(100%+80px)] w-[calc(100%+80px)] -left-10 -top-10"
          style={{ transform: `translate(${dragPx.x}px, ${dragPx.y}px)` }}
        >
          <iframe
            key={`${basePos.lat.toFixed(5)}-${basePos.lng.toFixed(5)}-${zoom}`}
            title="Google Maps — ubicación de entrega"
            src={googleMapsEmbedUrl(basePos.lat, basePos.lng, zoom)}
            className="pointer-events-none h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full drop-shadow-md">
          <svg width="36" height="48" viewBox="0 0 36 48" aria-hidden>
            <path
              d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"
              fill="#EA4335"
            />
            <circle cx="18" cy="18" r="7" fill="#fff" />
          </svg>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 z-40 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          <button
            type="button"
            aria-label="Acercar mapa"
            onClick={() => changeZoom(zoom + 1)}
            className="pointer-events-auto px-3 py-2 text-lg font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            disabled={zoom >= MAP_ZOOM_MAX}
          >
            +
          </button>
          <div className="border-t border-gray-100 px-2 py-0.5 text-center text-[10px] text-gray-500">
            {zoom}
          </div>
          <button
            type="button"
            aria-label="Alejar mapa"
            onClick={() => changeZoom(zoom - 1)}
            className="pointer-events-auto px-3 py-2 text-lg font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            disabled={zoom <= MAP_ZOOM_MIN}
          >
            −
          </button>
        </div>

        <div
          ref={overlayRef}
          className={`absolute inset-0 z-30 touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          aria-label="Arrastra o pellizca para ajustar la ubicación"
          role="application"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span>
          📌 {basePos.lat.toFixed(6)}, {basePos.lng.toFixed(6)}
        </span>
        <a
          href={mapsLink(String(basePos.lat), String(basePos.lng))}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline hover:text-blue-800"
        >
          Abrir en Google Maps
        </a>
      </div>

      {geoError && <p className="text-xs text-amber-600">{geoError}</p>}
    </div>
  );
}
