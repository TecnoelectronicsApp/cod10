import type { BotCatalog, BotProduct } from './catalog';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreProduct(product: BotProduct, queryNorm: string, tokens: string[]): number {
  const nameNorm = normalize(product.name);
  const descNorm = normalize(product.description || '');
  const catNorm = normalize(product.category);

  if (nameNorm === queryNorm) return 100;
  if (nameNorm.includes(queryNorm)) return 80;
  if (queryNorm.includes(nameNorm) && nameNorm.length > 3) return 75;

  let score = 0;
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (nameNorm.includes(t)) score += 30;
    if (descNorm.includes(t)) score += 10;
    if (catNorm.includes(t)) score += 5;
  }
  return score;
}

export function searchProducts(catalog: BotCatalog, query: string, limit = 3): BotProduct[] {
  const queryNorm = normalize(query);
  if (!queryNorm) return [];

  const tokens = queryNorm.split(' ').filter(Boolean);

  return catalog.products
    .map((p) => ({ p, score: scoreProduct(p, queryNorm, tokens) }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

export function formatProductPitch(product: BotProduct, catalog: BotCatalog): string {
  const sym = catalog.currencySymbol;
  const mainPrice = product.prices[0];
  const priceUsd = mainPrice ? `${sym}${mainPrice.amount}` : 'consultar';
  const priceBs =
    mainPrice?.amountVes !== undefined
      ? ` / Bs ${mainPrice.amountVes.toLocaleString('es-VE')}`
      : '';

  const lines = [`*${product.name}* — ${priceUsd}${priceBs}`];

  if (product.description?.trim()) {
    lines.push(product.description.trim());
  }

  if (product.prices.length > 1) {
    const vars = product.prices.map((v) => `${v.label}: ${sym}${v.amount}`).join(' · ');
    lines.push(`Variaciones: ${vars}`);
  }

  if (product.stock !== undefined && product.stock <= 5) {
    lines.push(`Quedan pocas unidades (${product.stock}).`);
  }

  lines.push('¿A dónde te lo enviamos? Así te doy el delivery aproximado 🛵');
  return lines.join('\n');
}
