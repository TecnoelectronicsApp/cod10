/**
 * Configura Codigo 10 + OpenWA en Render (todo en la nube).
 *
 * Uso después de desplegar OpenWA en Render:
 *
 *   OPENWA_RENDER_URL=https://openwa-cod10.onrender.com
 *   OPENWA_API_KEY=owa_...
 *   OPENWA_SESSION_ID=uuid
 *   GEMINI_API_KEY=AIza...
 *   WEBHOOK_SECRET=secreto
 *   node scripts/setup-render-openwa.mjs
 */
const renderUrl = (
  process.env.OPENWA_RENDER_URL ||
  process.env.OPENWA_BASE_URL ||
  ''
).replace(/\/+$/, '');
const apiKey = process.env.OPENWA_API_KEY;
const sessionId = process.env.OPENWA_SESSION_ID;
const cod10Url = (process.env.COD10_VERCEL_URL || 'https://cod10.vercel.app').replace(/\/+$/, '');
const webhookSecret = process.env.WEBHOOK_SECRET;
const webhookUrl = `${cod10Url}/api/bot/webhook`;

console.log('=== Codigo 10 + OpenWA (Render) ===\n');

if (!renderUrl || !apiKey || !sessionId) {
  console.error('Faltan variables: OPENWA_RENDER_URL, OPENWA_API_KEY, OPENWA_SESSION_ID');
  process.exit(1);
}

console.log('1. Verificando OpenWA en Render...');
const health = await fetch(`${renderUrl}/api/health/ready`);
if (!health.ok) {
  console.error('   OpenWA no responde:', health.status, await health.text());
  process.exit(1);
}
console.log('   OK —', renderUrl);

console.log('\n2. Registrando webhook →', webhookUrl);
const whRes = await fetch(`${renderUrl}/api/sessions/${encodeURIComponent(sessionId)}/webhooks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
  body: JSON.stringify({
    url: webhookUrl,
    events: ['message.received'],
    secret: webhookSecret || undefined,
  }),
});

if (!whRes.ok) {
  console.error('   Error webhook:', whRes.status, await whRes.text());
  process.exit(1);
}
console.log('   Webhook registrado:', await whRes.json());

console.log('\n3. Configura el admin (si aún no lo hiciste):');
console.log('   https://cod10-admin.vercel.app/#/admin/configuration');
console.log('   Bot WhatsApp (IA):');
console.log('   - URL OpenWA:', renderUrl);
console.log('   - Session ID:', sessionId);
console.log('   - API Key OpenWA: (la que usaste arriba)');
console.log('   - WEBHOOK_SECRET:', webhookSecret || '(opcional)');
console.log('   - Gemini API Key: (Google AI Studio)');
console.log('\n4. Prueba: escribe por WhatsApp al número vinculado.');
console.log('\nListo.');
