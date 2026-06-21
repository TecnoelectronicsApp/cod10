import type { BotCatalog } from './catalog';
import { wantsMenuLink } from './conversation-flow';
import type { DeliveryEstimate } from './delivery';
import { buildDeliveryRulesText, formatDeliveryEstimate } from './delivery';
import { formatProductPitch, searchProducts } from './product-search';
import { buildWhatsAppAccessUrl } from '@/lib/quick-auth';

/** Solo si Gemini falla — respuesta corta con búsqueda de productos y delivery por distancia */
export function buildFallbackReply(
  catalog: BotCatalog,
  userMessage: string,
  options?: { deliveryEstimate?: DeliveryEstimate | null; customerPhone?: string },
): string {
  const storeUrl = catalog.storeUrl || 'https://cod10.vercel.app';
  const sym = catalog.currencySymbol;
  const q = userMessage.toLowerCase();

  if (wantsMenuLink(userMessage)) {
    return `Aquí tienes nuestro menú 🍔\n\n${storeUrl}`;
  }

  const productMatches = searchProducts(catalog, userMessage, 1);
  if (productMatches.length === 1 && /(quiero|pedir|dame|una|uno|me\s+antoja|big|brasa|hamburg|pepito|combo)/i.test(q)) {
    let pitch = formatProductPitch(productMatches[0], catalog);
    if (options?.deliveryEstimate) {
      pitch += `\n\n${formatDeliveryEstimate(options.deliveryEstimate, sym)}`;
    }
    if (options?.customerPhone) {
      pitch += `\n\nConfirma tu pedido aquí: ${buildWhatsAppAccessUrl(options.customerPhone, '/checkout')}`;
    }
    return pitch;
  }

  if (options?.deliveryEstimate) {
    return `${formatDeliveryEstimate(options.deliveryEstimate, sym)}. ¿Qué te gustaría pedir?`;
  }

  if (/d[oó]lar|bcv|tasa|bol[ií]var|bs\.?/i.test(q) && catalog.bcvRate) {
    return `La tasa BCV hoy es *${catalog.bcvRate} Bs/USD*${catalog.bcvRateDate ? ` (${catalog.bcvRateDate})` : ''}. ¿Te ayudo con algo más? 🍔`;
  }

  if (/delivery|env[ií]o|domicilio|entrega|cu[aá]nto\s+cuesta\s+el\s+env/i.test(q)) {
    return `${buildDeliveryRulesText(sym).split('\n').slice(1).join('\n')}\n\n¿A dónde te lo enviamos?`;
  }

  if (/precio|cuesta|cu[aá]nto|hamburguesa/i.test(q)) {
    const matches = searchProducts(catalog, userMessage, 3);
    if (matches.length > 0) {
      return matches.map((p) => formatProductPitch(p, catalog)).join('\n\n');
    }
  }

  return `Gracias por escribir 😊 Cuéntame qué te provoca pedir o comparte tu ubicación para estimar el delivery.`;
}
