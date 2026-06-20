/**
 * Registra webhook OpenWA → Codigo 10 platform
 * Ejecutar desde la raíz del repo cod10:
 *   npx tsx scripts/setup-openwa-webhook.mjs
 */
const openwaBase = process.env.OPENWA_BASE_URL?.replace(/\/+$/, '');
const openwaApiKey = process.env.OPENWA_API_KEY;
const sessionId = process.env.OPENWA_SESSION_ID;
const cod10Url = (process.env.COD10_VERCEL_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cod10.vercel.app').replace(/\/+$/, '');
const webhookSecret = process.env.WEBHOOK_SECRET;

if (!openwaBase || !openwaApiKey || !sessionId) {
  console.error('Variables requeridas: OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID');
  process.exit(1);
}

const webhookUrl = `${cod10Url}/api/bot/webhook`;

const res = await fetch(`${openwaBase}/api/sessions/${encodeURIComponent(sessionId)}/webhooks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': openwaApiKey },
  body: JSON.stringify({
    url: webhookUrl,
    events: ['message.received'],
    secret: webhookSecret || undefined,
  }),
});

if (!res.ok) {
  console.error('Error:', res.status, await res.text());
  process.exit(1);
}

console.log('Webhook registrado:', webhookUrl);
console.log(await res.json());
