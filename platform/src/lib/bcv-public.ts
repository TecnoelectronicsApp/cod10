import type { BcvRate } from './bcv-rate';

const BCV_PUBLIC_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

export async function fetchBcvRatePublic(): Promise<BcvRate | null> {
  try {
    const res = await fetch(BCV_PUBLIC_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.promedio ?? data.valor ?? data.venta);
    if (!rate || rate <= 0 || Number.isNaN(rate)) return null;
    return {
      rate,
      rateDate: data.fechaActualizacion || data.fecha,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
