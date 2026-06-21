import type { BotCatalog } from './catalog';

/** Solo si Gemini falla en turno 3+ — respuesta corta, no volcar catálogo entero */
export function buildFallbackReply(catalog: BotCatalog, userMessage: string): string {
  const storeUrl = catalog.storeUrl || 'https://cod10.vercel.app';
  const q = userMessage.toLowerCase();

  if (/d[oó]lar|bcv|tasa|bol[ií]var|bs\.?/i.test(q) && catalog.bcvRate) {
    return `La tasa BCV hoy es *${catalog.bcvRate} Bs/USD*${catalog.bcvRateDate ? ` (${catalog.bcvRateDate})` : ''}. ¿Te ayudo con algo más del menú? 🍔`;
  }

  if (/delivery|env[ií]o|domicilio|entrega/i.test(q)) {
    return `El delivery cuesta *$${catalog.deliveryCharges}* 🛵. Puedes ver todo el menú aquí: ${storeUrl}`;
  }

  if (/precio|cuesta|cu[aá]nto|menu|menú|hamburguesa/i.test(q)) {
    const sample = catalog.products.slice(0, 3).map((p) => {
      const price = p.prices[0];
      return `• ${p.name}: $${price?.amount ?? '?'}`;
    });
    return `${sample.join('\n')}\n\nMenú completo: ${storeUrl}`;
  }

  return `Gracias por escribir 😊 Estoy teniendo un pequeño delay con la IA. Mientras tanto, revisa el menú: ${storeUrl}\n\n¿En qué más te ayudo?`;
}
