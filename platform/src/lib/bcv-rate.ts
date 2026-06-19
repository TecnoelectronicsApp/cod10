import { getBcvApiBase } from './bcv-api-base';
import { fetchBcvRatePublic } from './bcv-public';

const BCV_CACHE_KEY = 'cod10-bcv-rate';
const CACHE_MS = 60 * 60 * 1000;
const DEFAULT_RATE = 36.5;

export type BcvRate = {
  rate: number;
  rateDate?: string;
  fetchedAt: string;
};

function readCache(allowStale = false): BcvRate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BCV_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BcvRate;
    if (!parsed.rate || !parsed.fetchedAt) return null;
    if (
      !allowStale &&
      Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate: BcvRate) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BCV_CACHE_KEY, JSON.stringify(rate));
}

async function fetchFromConfiguredApi(): Promise<BcvRate | null> {
  const base = getBcvApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/usd`);
  if (!res.ok) return null;
  const data = await res.json();
  const rate = Number(data.valor);
  if (!rate || rate <= 0) return null;
  return {
    rate,
    rateDate: data.fecha,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromStoreConfig(): Promise<BcvRate | null> {
  const { fetchStoreConfig } = await import('./store-config');
  const config = await fetchStoreConfig();
  const multi = config.multiCurrency;
  if (!multi || multi.enabled === false || !multi.exchangeRate || multi.exchangeRate <= 0) {
    return null;
  }
  return {
    rate: multi.exchangeRate,
    rateDate: multi.rateDate || undefined,
    fetchedAt: multi.rateFetchedAt || new Date().toISOString(),
  };
}

export async function fetchBcvRate(): Promise<BcvRate> {
  const fresh = readCache(false);
  if (fresh) return fresh;

  const sources = [
    fetchFromStoreConfig,
    fetchBcvRatePublic,
    fetchFromConfiguredApi,
  ];

  for (const source of sources) {
    try {
      const result = await source();
      if (result && result.rate > 0) {
        writeCache(result);
        return result;
      }
    } catch {
      /* siguiente fuente */
    }
  }

  const stale = readCache(true);
  if (stale) return stale;

  const fallback: BcvRate = {
    rate: DEFAULT_RATE,
    fetchedAt: new Date().toISOString(),
  };
  writeCache(fallback);
  return fallback;
}

export function getCachedBcvRate(): BcvRate | null {
  return readCache(false);
}

export function getLastKnownBcvRate(): BcvRate | null {
  return readCache(true);
}
