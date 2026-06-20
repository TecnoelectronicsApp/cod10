import type { BotCatalog } from './catalog';

/** Respuesta básica sin Gemini cuando la API falla (cuota, clave inválida, etc.). */
export function buildFallbackReply(catalog: BotCatalog, _userMessage: string): string {
  const storeUrl = catalog.storeUrl || 'https://cod10.vercel.app';
  const burgers = catalog.products
    .filter((p) => /hamburg|parrill|pollo|brasa/i.test(p.name + (p.category || '')))
    .slice(0, 5);

  const lines =
    burgers.length > 0
      ? burgers.map((p) => {
          const price = p.prices[0];
          const usd = price ? `$${price.amount}` : '';
          const ves = price?.amountVes ? ` / Bs ${price.amountVes.toLocaleString('es-VE')}` : '';
          return `• ${p.name}: ${usd}${ves}`;
        })
      : catalog.products.slice(0, 5).map((p) => {
          const price = p.prices[0];
          return `• ${p.name}: $${price?.amount ?? '?'}`;
        });

  const payments = catalog.paymentMethods
    .filter((m) => m.enabled)
    .map((m) => m.label)
    .join(', ');

  return [
    '¡Hola! 👋 Gracias por escribir a *Codigo 10*.',
    '',
    'Sí, tenemos hamburguesas y más:',
    ...lines,
    '',
    `🛵 Delivery: $${catalog.deliveryCharges}`,
    payments ? `💳 Pagos: ${payments}` : '',
    '',
    `Pedidos en la web: ${storeUrl}`,
  ]
    .filter(Boolean)
    .join('\n');
}
