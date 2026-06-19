import { Category, Food } from './types';

export type FallbackCatalog = {
  updatedAt?: string;
  configuration: {
    currency?: string;
    currency_symbol: string;
    delivery_charges: number;
  };
  categories: Category[];
  foodsByCategory: Record<string, Food[]>;
};

const CLOUDINARY_MENU_URL =
  'https://res.cloudinary.com/dimjm4ald/raw/upload/food/cod10/menu-v1.json';

let cached: FallbackCatalog | null = null;

async function loadLocalFallback(): Promise<FallbackCatalog> {
  const res = await fetch('/catalog-fallback.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar catalog-fallback.json');
  return res.json();
}

/** Catálogo offline cuando la API Enatega/demo no responde (MongoDB caído). */
export async function fetchFallbackCatalog(): Promise<FallbackCatalog> {
  if (cached) return cached;

  try {
    const res = await fetch(CLOUDINARY_MENU_URL, { cache: 'no-store' });
    if (res.ok) {
      cached = await res.json();
      return cached!;
    }
  } catch {
    /* Cloudinary opcional */
  }

  cached = await loadLocalFallback();
  return cached;
}

export function foodsForCategory(catalog: FallbackCatalog, categoryId: string): Food[] {
  return catalog.foodsByCategory[categoryId] ?? [];
}
