import type { BotCatalog } from './catalog';
import { wantsMenuLink } from './conversation-flow';

/** Solo si Gemini falla — respuesta corta, sin volcar catálogo ni link del menú salvo solicitud */
export function buildFallbackReply(catalog: BotCatalog, userMessage: string): string {
  const storeUrl = catalog.storeUrl || 'https://cod10.vercel.app';
  const q = userMessage.toLowerCase();

  if (wantsMenuLink(userMessage)) {
    return `Aquí tienes nuestro menú 🍔\n\n${storeUrl}`;
  }

  if (/d[oó]lar|bcv|tasa|bol[ií]var|bs\.?/i.test(q) && catalog.bcvRate) {
    return `La tasa BCV hoy es *${catalog.bcvRate} Bs/USD*${catalog.bcvRateDate ? ` (${catalog.bcvRateDate})` : ''}. ¿Te ayudo con algo más? 🍔`;
  }

  if (/delivery|env[ií]o|domicilio|entrega/i.test(q)) {
    return `El delivery cuesta *$${catalog.deliveryCharges}* 🛵. ¿Qué te gustaría pedir?`;
  }

  if (/precio|cuesta|cu[aá]nto|hamburguesa/i.test(q)) {
    const sample = catalog.products.slice(0, 3).map((p) => {
      const price = p.prices[0];
      return `• ${p.name}: $${price?.amount ?? '?'}`;
    });
    return `${sample.join('\n')}\n\n¿Quieres saber el precio de alguno en particular?`;
  }

  return `Gracias por escribir 😊 Estoy teniendo un pequeño delay con la IA. Cuéntame qué te provoca o pregúntame lo que necesites.`;
}
