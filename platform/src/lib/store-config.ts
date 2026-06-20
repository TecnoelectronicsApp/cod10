import { getBcvApiBase } from './bcv-api-base';

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

export type StoreLocation = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  details?: string;
};

export type StoreConfig = {
  paymentMethods: PaymentMethodConfig[];
  storeLocation?: StoreLocation;
  multiCurrency?: {
    enabled?: boolean;
    exchangeRate?: number;
    secondarySymbol?: string;
    rateDate?: string | null;
    rateFetchedAt?: string | null;
  };
};

const DEFAULT_STORE_LOCATION: StoreLocation = {
  name: 'Codigo 10',
  address: 'Local Codigo 10',
  latitude: '10.490771409353307',
  longitude: '-66.95274734821183',
  details: 'Retiro en mostrador',
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
  multiCurrency: {
    enabled: true,
    exchangeRate: 36.5,
    secondarySymbol: 'Bs.',
    rateDate: null,
    rateFetchedAt: null,
  },
};

const KNOWN_IDS = ['efectivo', 'punto_venta', 'pagomovil', 'binance'];

function normalizeStoreConfig(config: StoreConfig | null): StoreConfig {
  const defaults = DEFAULT_CONFIG.paymentMethods;
  const incoming = (config && config.paymentMethods) || [];
  const byId: Record<string, PaymentMethodConfig> = {};

  incoming.forEach((method) => {
    if (method && method.id && KNOWN_IDS.includes(method.id)) {
      byId[method.id] = method;
    }
  });

  return {
    paymentMethods: defaults.map((def) => {
      const saved = byId[def.id];
      if (!saved) return { ...def };
      const merged = { ...def, ...saved };
      (['phone', 'ci', 'payId', 'bankCode', 'bankName'] as const).forEach((key) => {
        const val = saved[key];
        if (typeof val === 'string' && val.trim()) merged[key] = val.trim();
      });
      return merged;
    }),
    storeLocation: {
      ...DEFAULT_STORE_LOCATION,
      ...(config?.storeLocation || {}),
    },
    multiCurrency: {
      ...DEFAULT_CONFIG.multiCurrency,
      ...(config && config.multiCurrency ? config.multiCurrency : {}),
    },
  };
}

const CLOUDINARY_STORE_CONFIG_URL =
  process.env.NEXT_PUBLIC_STORE_CONFIG_URL ||
  'https://res.cloudinary.com/dimjm4ald/raw/upload/food/cod10/store-config-v3.json';

async function fetchFromCloudinary(): Promise<StoreConfig | null> {
  const url =
    CLOUDINARY_STORE_CONFIG_URL +
    (CLOUDINARY_STORE_CONFIG_URL.includes('?') ? '&' : '?') +
    't=' +
    Date.now();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && data.paymentMethods) return normalizeStoreConfig(data as StoreConfig);
  return null;
}

async function fetchFromBcvApi(): Promise<StoreConfig | null> {
  const base = getBcvApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/store-config`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.paymentMethods) return normalizeStoreConfig(data as StoreConfig);
  } catch {
    return null;
  }
  return null;
}

async function fetchFromPublicJson(): Promise<StoreConfig | null> {
  try {
    const res = await fetch('/cod10-store-config.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.paymentMethods) return normalizeStoreConfig(data as StoreConfig);
  } catch {
    return null;
  }
  return null;
}

export async function fetchStoreConfig(): Promise<StoreConfig> {
  const cloud = await fetchFromCloudinary();
  if (cloud) return cloud;

  const bcv = await fetchFromBcvApi();
  if (bcv) return bcv;

  const local = await fetchFromPublicJson();
  if (local) return local;

  return normalizeStoreConfig(DEFAULT_CONFIG);
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
    if (method.bankCode) {
      lines.push(
        `Código banco: ${method.bankCode}${method.bankName ? ` — ${method.bankName}` : ''}`
      );
    }
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
