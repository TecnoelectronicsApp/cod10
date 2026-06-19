/**
 * Publica store-config completo en Cloudinary (métodos de pago + multimoneda).
 * Uso: node scripts/restore-payment-methods-cloudinary.mjs
 */

const CONFIG = {
  paymentMethods: [
    { id: 'efectivo', enabled: true, label: 'Efectivo' },
    { id: 'punto_venta', enabled: true, label: 'Punto de venta' },
    {
      id: 'pagomovil',
      enabled: true,
      label: 'Pagomóvil',
      bankCode: '0102',
      bankName: 'Banco de Venezuela',
      phone: '04267333600',
      ci: 'V16218465',
    },
    { id: 'binance', enabled: false, label: 'Binance', payId: '' },
  ],
  multiCurrency: {
    enabled: true,
    exchangeRate: 607.39,
    secondarySymbol: 'Bs.',
    rateDate: '2026-06-19T00:00:00-04:00',
    rateFetchedAt: new Date().toISOString(),
  },
};

const fd = new FormData();
fd.append('file', new Blob([JSON.stringify(CONFIG, null, 2)], { type: 'application/json' }), 'store-config.json');
fd.append('upload_preset', 'wdgvyas8');
fd.append('public_id', 'cod10/store-config-v3');

const res = await fetch('https://api.cloudinary.com/v1_1/dimjm4ald/raw/upload', {
  method: 'POST',
  body: fd,
});
const data = await res.json();
if (!res.ok) {
  console.error('Error:', data);
  process.exit(1);
}
console.log('Restaurado en Cloudinary:', data.secure_url);

const CHECK_URL =
  'https://res.cloudinary.com/dimjm4ald/raw/upload/food/cod10/store-config-v3.json';
console.log('Verificación:', await (await fetch(CHECK_URL + '?t=' + Date.now())).json());
