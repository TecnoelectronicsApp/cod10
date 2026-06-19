import type { PaymentMethodConfig, StoreConfig } from '../store-config';
import { getBcvApiBase } from '../bcv-api-base';

export async function fetchStoreConfigServer(): Promise<StoreConfig> {
  const base = getBcvApiBase();

  if (base) {
    try {
      const res = await fetch(`${base}/store-config`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.paymentMethods) return data as StoreConfig;
      }
    } catch {
      /* fallback estático */
    }
  }

  try {
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://cod10.vercel.app')
    ).replace(/\/$/, '');

    const res = await fetch(`${siteUrl}/cod10-store-config.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.paymentMethods) return data as StoreConfig;
    }
  } catch {
    /* default */
  }

  return {
    paymentMethods: [
      { id: 'efectivo', enabled: true, label: 'Efectivo' },
      { id: 'punto_venta', enabled: true, label: 'Punto de venta' },
      {
        id: 'pagomovil',
        enabled: true,
        label: 'Pagomóvil',
        bankCode: '0102',
        bankName: 'Banco de Venezuela',
        phone: '',
        ci: '',
      },
    ],
  };
}

export async function fetchBcvRateServer(): Promise<{ rate: number; rateDate?: string } | null> {
  const base = getBcvApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/usd`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.valor);
    if (!rate || rate <= 0) return null;
    return { rate, rateDate: data.fecha };
  } catch {
    return null;
  }
}

export function formatPaymentMethodForBot(method: PaymentMethodConfig): string[] {
  const lines: string[] = [`• ${method.label}`];
  if (method.id === 'pagomovil') {
    if (method.bankCode) {
      lines.push(`  Banco: ${method.bankCode}${method.bankName ? ` — ${method.bankName}` : ''}`);
    }
    if (method.phone) lines.push(`  Teléfono Pagomóvil: ${method.phone}`);
    if (method.ci) lines.push(`  Cédula/RIF: ${method.ci}`);
  }
  if (method.id === 'binance' && method.payId) {
    lines.push(`  Pay ID Binance: ${method.payId}`);
  }
  if (method.id === 'efectivo') {
    lines.push('  Pago en efectivo al recibir el pedido.');
  }
  if (method.id === 'punto_venta') {
    lines.push('  Pago con tarjeta en punto de venta al recibir.');
  }
  return lines;
}
