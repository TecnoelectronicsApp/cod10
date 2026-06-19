export type PaymentMethodConfig = {
  id: string;
  enabled: boolean;
  label: string;
  bankCode?: string;
  bankName?: string;
  phone?: string;
  ci?: string;
  payId?: string;
};

export type StoreConfig = {
  paymentMethods: PaymentMethodConfig[];
};

const DEFAULT_CONFIG: StoreConfig = {
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
    { id: 'binance', enabled: false, label: 'Binance', payId: '' },
  ],
};

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_BCV_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

export async function fetchStoreConfig(): Promise<StoreConfig> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/store-config`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.paymentMethods) return data as StoreConfig;
    }
  } catch {
    /* fallback */
  }

  try {
    const res = await fetch('/cod10-store-config.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.paymentMethods) return data as StoreConfig;
    }
  } catch {
    /* fallback */
  }

  return DEFAULT_CONFIG;
}

export function getEnabledPaymentMethods(config: StoreConfig): PaymentMethodConfig[] {
  return (config.paymentMethods || []).filter((m) => m.enabled);
}

export function buildPaymentMethodLabel(method: PaymentMethodConfig): string {
  if (method.id === 'pagomovil') {
    const bank = method.bankCode || '';
    const phone = method.phone || '';
    const ci = method.ci || '';
    return `Pagomóvil (${bank} · ${phone} · ${ci})`;
  }
  if (method.id === 'binance' && method.payId) {
    return `Binance (${method.payId})`;
  }
  return method.label;
}

export function formatPaymentDetails(method: PaymentMethodConfig): string[] {
  const lines: string[] = [];
  if (method.id === 'pagomovil') {
    if (method.bankCode) lines.push(`Código banco: ${method.bankCode}${method.bankName ? ` — ${method.bankName}` : ''}`);
    if (method.phone) lines.push(`Teléfono: ${method.phone}`);
    if (method.ci) lines.push(`Cédula: ${method.ci}`);
  }
  if (method.id === 'binance' && method.payId) {
    lines.push(`ID Binance: ${method.payId}`);
  }
  if (method.id === 'punto_venta') {
    lines.push('Paga con tarjeta débito/crédito en punto de venta al recibir.');
  }
  if (method.id === 'efectivo') {
    lines.push('Paga en efectivo al recibir tu pedido.');
  }
  return lines;
}
