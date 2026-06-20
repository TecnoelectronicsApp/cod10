const METHOD_LABELS: Record<string, string> = {
  COD: 'Efectivo',
  cod: 'Efectivo',
  efectivo: 'Efectivo',
  cash: 'Efectivo',
  punto_venta: 'Punto de venta',
  POS: 'Punto de venta',
  pagomovil: 'Pagomóvil',
  PAGOMOVIL: 'Pagomóvil',
  binance: 'Binance',
  CARD: 'Tarjeta',
  PAYPAL: 'PayPal',
  STRIPE: 'Stripe',
};

/** Etiqueta legible del método de pago (efectivo, pagomóvil, etc.). */
export function resolvePaymentMethodLabel(
  paymentMethod?: string,
  addressDetails?: string
): string {
  if (paymentMethod) {
    const direct = METHOD_LABELS[paymentMethod] || METHOD_LABELS[paymentMethod.toLowerCase()];
    if (direct) return direct;
    if (paymentMethod !== 'COD') return paymentMethod;
  }

  const details = addressDetails || '';
  const match = details.match(/Pago:\s*([^|]+)/i);
  if (match) {
    const raw = match[1].trim();
    if (raw.startsWith('Pagomóvil') || raw.startsWith('Pagomovil')) return 'Pagomóvil';
    if (raw.startsWith('Punto de venta')) return 'Punto de venta';
    if (raw.startsWith('Binance')) return 'Binance';
    if (raw.startsWith('Efectivo')) return 'Efectivo';
    return raw.split('(')[0].trim();
  }

  if (paymentMethod === 'COD') return 'Efectivo';
  return paymentMethod || '—';
}

/** Quita líneas de pago y billete de los detalles de dirección. */
export function cleanAddressDetails(details?: string): string {
  if (!details) return '';
  return details
    .split('|')
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !/^Pago:/i.test(s) &&
        !/^Billete:/i.test(s) &&
        !/^Vuelto:/i.test(s)
    )
    .join(' | ');
}
