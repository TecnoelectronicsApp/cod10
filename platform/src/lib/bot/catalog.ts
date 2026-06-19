import { fetchAllFoods } from './graphql';
import {
  fetchBcvRateServer,
  fetchStoreConfigServer,
  formatPaymentMethodForBot,
} from './store-config-server';
import type { PaymentMethodConfig } from '../store-config';

export type BotProduct = {
  id: string;
  name: string;
  description?: string;
  category: string;
  stock?: number;
  imageUrl?: string;
  prices: Array<{
    variationId: string;
    label: string;
    currency: string;
    amount: number;
    amountVes?: number;
    discounted?: number;
  }>;
};

export type BotCatalog = {
  products: BotProduct[];
  paymentMethods: PaymentMethodConfig[];
  currency: string;
  currencySymbol: string;
  deliveryCharges: number;
  bcvRate: number | null;
  bcvRateDate?: string;
  storeUrl: string;
  fetchedAt: string;
};

function getStoreUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://cod10.vercel.app';
}

export async function buildBotCatalog(): Promise<BotCatalog> {
  const [{ foods, configuration }, storeConfig, bcv] = await Promise.all([
    fetchAllFoods(),
    fetchStoreConfigServer(),
    fetchBcvRateServer(),
  ]);

  const currency = configuration?.currency ?? 'USD';
  const currencySymbol = configuration?.currency_symbol ?? '$';
  const deliveryCharges = configuration?.delivery_charges ?? 0;
  const enabledPayments = (storeConfig.paymentMethods ?? []).filter((m) => m.enabled);

  const products: BotProduct[] = foods.map((food) => ({
    id: food._id,
    name: food.title,
    description: food.description,
    category: food.categoryTitle,
    stock: food.stock,
    imageUrl: food.img_url,
    prices: (food.variations ?? []).map((v) => {
      const amount = v.discounted && v.discounted > 0 ? v.discounted : v.price;
      return {
        variationId: v._id,
        label: v.title,
        currency,
        amount,
        amountVes: bcv?.rate ? Math.round(amount * bcv.rate * 100) / 100 : undefined,
        discounted: v.discounted,
      };
    }),
  }));

  return {
    products,
    paymentMethods: enabledPayments,
    currency,
    currencySymbol,
    deliveryCharges,
    bcvRate: bcv?.rate ?? null,
    bcvRateDate: bcv?.rateDate,
    storeUrl: getStoreUrl(),
    fetchedAt: new Date().toISOString(),
  };
}

export function buildCatalogContext(catalog: BotCatalog): string {
  const lines: string[] = [
    '=== CODIGO 10 — MENÚ Y PRECIOS ===',
    `Tienda web: ${catalog.storeUrl}`,
    `Moneda base: ${catalog.currency} (${catalog.currencySymbol})`,
    `Costo de delivery: ${catalog.currencySymbol}${catalog.deliveryCharges}`,
  ];

  if (catalog.bcvRate) {
    lines.push(`Tasa BCV: ${catalog.bcvRate} Bs/USD${catalog.bcvRateDate ? ` (${catalog.bcvRateDate})` : ''}`);
  }

  lines.push('\n=== PRODUCTOS ===');
  if (catalog.products.length === 0) {
    lines.push('(Sin productos disponibles)');
  } else {
    let currentCategory = '';
    for (const p of catalog.products) {
      if (p.category !== currentCategory) {
        currentCategory = p.category;
        lines.push(`\n[${currentCategory}]`);
      }
      lines.push(`• ${p.name}`);
      if (p.description) lines.push(`  ${p.description}`);
      if (p.stock !== undefined) lines.push(`  Stock: ${p.stock}`);
      for (const price of p.prices) {
        const ves =
          price.amountVes !== undefined ? ` / Bs ${price.amountVes.toLocaleString('es-VE')}` : '';
        lines.push(
          `  ${price.label}: ${catalog.currencySymbol}${price.amount}${ves}`,
        );
      }
    }
  }

  lines.push('\n=== MÉTODOS DE PAGO ===');
  if (catalog.paymentMethods.length === 0) {
    lines.push('(Sin métodos de pago configurados)');
  } else {
    for (const method of catalog.paymentMethods) {
      lines.push(...formatPaymentMethodForBot(method));
    }
  }

  lines.push(
    '\n=== INSTRUCCIONES ===',
    'Para hacer pedido el cliente puede visitar la tienda web o indicar productos por WhatsApp.',
    'Los precios en Bs usan la tasa BCV del día.',
  );

  return lines.join('\n');
}
