import { fetchAllFoods, type GraphqlCategory } from './graphql';
import {
  fetchBcvRateServer,
  fetchStoreConfigServer,
  formatPaymentMethodForBot,
} from './store-config-server';
import type { PaymentMethodConfig } from '../store-config';
import { buildDeliveryRulesText } from './delivery';

export type BotAddonOption = {
  id: string;
  title: string;
  description?: string;
  price: number;
};

export type BotAddon = {
  id: string;
  title: string;
  description?: string;
  minQty?: number;
  maxQty?: number;
  options: BotAddonOption[];
};

export type BotProduct = {
  id: string;
  name: string;
  description?: string;
  category: string;
  categoryId: string;
  stock?: number;
  imageUrl?: string;
  tag?: string;
  prices: Array<{
    variationId: string;
    label: string;
    currency: string;
    amount: number;
    amountVes?: number;
    discounted?: number;
    addons: BotAddon[];
  }>;
};

export type BotCategory = {
  id: string;
  title: string;
  description?: string;
  productCount: number;
};

export type BotCatalog = {
  categories: BotCategory[];
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

function mapAddons(addons: GraphqlFoodVariationAddon[] | undefined): BotAddon[] {
  return (addons ?? []).map((a) => ({
    id: a._id,
    title: a.title,
    description: a.description,
    minQty: a.quantity_minimum,
    maxQty: a.quantity_maximum,
    options: (a.options ?? []).map((o) => ({
      id: o._id,
      title: o.title,
      description: o.description,
      price: o.price,
    })),
  }));
}

type GraphqlFoodVariationAddon = {
  _id: string;
  title: string;
  description?: string;
  quantity_minimum?: number;
  quantity_maximum?: number;
  options?: Array<{ _id: string; title: string; description?: string; price: number }>;
};

export async function buildBotCatalog(): Promise<BotCatalog> {
  const [{ categories, foods, configuration }, storeConfig, bcv] = await Promise.all([
    fetchAllFoods(),
    fetchStoreConfigServer(),
    fetchBcvRateServer(),
  ]);

  const currency = configuration?.currency ?? 'USD';
  const currencySymbol = configuration?.currency_symbol ?? '$';
  const deliveryCharges = configuration?.delivery_charges ?? 0;
  const enabledPayments = (storeConfig.paymentMethods ?? []).filter((m) => m.enabled);

  const categoryCounts = new Map<string, number>();
  for (const food of foods) {
    categoryCounts.set(food.categoryId, (categoryCounts.get(food.categoryId) ?? 0) + 1);
  }

  const botCategories: BotCategory[] = categories.map((c: GraphqlCategory) => ({
    id: c._id,
    title: c.title,
    description: c.description,
    productCount: categoryCounts.get(c._id) ?? 0,
  }));

  const products: BotProduct[] = foods.map((food) => ({
    id: food._id,
    name: food.title,
    description: food.description,
    category: food.categoryTitle,
    categoryId: food.categoryId,
    stock: food.stock,
    imageUrl: food.img_url,
    tag: food.tag,
    prices: (food.variations ?? []).map((v) => {
      const amount = v.discounted && v.discounted > 0 ? v.discounted : v.price;
      return {
        variationId: v._id,
        label: v.title,
        currency,
        amount,
        amountVes: bcv?.rate ? Math.round(amount * bcv.rate * 100) / 100 : undefined,
        discounted: v.discounted,
        addons: mapAddons(v.addons),
      };
    }),
  }));

  return {
    categories: botCategories,
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

function formatAddonLine(addon: BotAddon, sym: string): string {
  const opts = addon.options
    .slice(0, 6)
    .map((o) => `${o.title}${o.price > 0 ? ` (+${sym}${o.price})` : ''}`)
    .join(', ');
  return opts ? `    ${addon.title}: ${opts}` : '';
}

export function buildCatalogContext(catalog: BotCatalog): string {
  const sym = catalog.currencySymbol;
  const lines: string[] = [
    '=== CODIGO 10 — CATÁLOGO COMPLETO ===',
    `Tienda web / checkout: ${catalog.storeUrl}`,
    `Moneda base: ${catalog.currency} (${sym})`,
    buildDeliveryRulesText(sym),
  ];

  if (catalog.bcvRate) {
    lines.push(
      `Tasa BCV: ${catalog.bcvRate} Bs/USD${catalog.bcvRateDate ? ` (${catalog.bcvRateDate})` : ''}`,
    );
  }

  lines.push('\n=== CATEGORÍAS ===');
  if (catalog.categories.length === 0) {
    lines.push('(Sin categorías)');
  } else {
    for (const cat of catalog.categories) {
      lines.push(`• ${cat.title} (${cat.productCount} productos)`);
      if (cat.description?.trim()) lines.push(`  ${cat.description.trim()}`);
    }
  }

  lines.push('\n=== PRODUCTOS (descripción = ingredientes/composición) ===');
  if (catalog.products.length === 0) {
    lines.push('(Sin productos disponibles)');
  } else {
    let currentCategory = '';
    for (const p of catalog.products) {
      if (p.category !== currentCategory) {
        currentCategory = p.category;
        lines.push(`\n[${currentCategory}]`);
      }
      lines.push(`• ${p.name}${p.stock !== undefined ? ` (stock: ${p.stock})` : ''}`);
      if (p.description?.trim()) {
        lines.push(`  Ingredientes/descripción: ${p.description.trim()}`);
      }
      for (const price of p.prices) {
        const ves =
          price.amountVes !== undefined ? ` / Bs ${price.amountVes.toLocaleString('es-VE')}` : '';
        lines.push(`  ${price.label}: ${sym}${price.amount}${ves}`);
        for (const addon of price.addons) {
          const addonLine = formatAddonLine(addon, sym);
          if (addonLine) lines.push(addonLine);
        }
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
    '\n=== FLUJO DE VENTA (WhatsApp → web) ===',
    '1. Cliente pide producto → confirma nombre, resume ingredientes desde la descripción, indica precio USD/Bs.',
    '2. Si hay variaciones o extras → menciónalas brevemente.',
    '3. Pregunta dirección de entrega o si retira en local.',
    '4. Con dirección/ubicación → estima delivery con la regla por distancia (datos arriba).',
    '5. Resume pedido sugerido + delivery aproximado.',
    '6. Invita a confirmar y pagar en la web (checkout). El pedido final se hace en la página, no por WhatsApp.',
  );

  return lines.join('\n');
}
