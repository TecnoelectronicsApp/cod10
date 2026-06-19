const BCV_CACHE_KEY = 'cod10-bcv-rate';
const CACHE_MS = 60 * 60 * 1000;

export type BcvRate = {
  rate: number;
  rateDate?: string;
  fetchedAt: string;
};

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_BCV_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  }
  return (process.env.NEXT_PUBLIC_BCV_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function readCache(): BcvRate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BCV_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BcvRate;
    if (!parsed.rate || !parsed.fetchedAt) return null;
    if (Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate: BcvRate) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BCV_CACHE_KEY, JSON.stringify(rate));
}

export async function fetchBcvRate(): Promise<BcvRate> {
  const cached = readCache();
  if (cached) return cached;

  const base = getApiBase();
  const res = await fetch(`${base}/usd`);
  if (!res.ok) throw new Error('No se pudo obtener la tasa BCV');
  const data = await res.json();
  const rate = Number(data.valor);
  if (!rate || rate <= 0) throw new Error('Tasa BCV inválida');

  const result: BcvRate = {
    rate,
    rateDate: data.fecha,
    fetchedAt: new Date().toISOString(),
  };
  writeCache(result);
  return result;
}

export function getCachedBcvRate(): BcvRate | null {
  return readCache();
}
