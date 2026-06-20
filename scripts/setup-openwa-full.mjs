/**
 * Reconfigura OpenWA tras reinicio de Render (sesión + webhook).
 * Uso: node scripts/setup-openwa-full.mjs
 */
const openwaBase = (process.env.OPENWA_BASE_URL || 'https://openwa-cod10.onrender.com').replace(/\/+$/, '');
const apiKey = (process.env.OPENWA_API_KEY || '').trim();
const webhookSecret = (process.env.WEBHOOK_SECRET || '').trim();
const cod10Url = (process.env.COD10_VERCEL_URL || 'https://cod10.vercel.app').replace(/\/+$/, '');
const sessionName = process.env.OPENWA_SESSION_NAME || 'bot10';
const existingSessionId = process.env.OPENWA_SESSION_ID;

if (!apiKey || !webhookSecret) {
  console.error('Faltan OPENWA_API_KEY y WEBHOOK_SECRET');
  process.exit(1);
}

const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };

async function json(method, path, body) {
  const res = await fetch(`${openwaBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

console.log('=== Setup OpenWA completo ===\n');

console.log('1. Health…');
await json('GET', '/api/health/ready');
console.log('   OK');

let sessionId = existingSessionId;
const sessions = await json('GET', '/api/sessions');

const existing = sessions.find((s) => s.id === sessionId || s.name === sessionName);
if (existing) {
  sessionId = existing.id;
  console.log(`2. Sesión existente: ${existing.name} (${sessionId}) — ${existing.status}`);
} else {
  console.log('2. Creando sesión…');
  const created = await json('POST', '/api/sessions', { name: sessionName });
  sessionId = created.id;
  console.log(`   Creada: ${sessionId}`);
}

if (existing?.status !== 'ready') {
  console.log('3. Iniciando sesión (escanea QR en admin si pide)…');
  try {
    await json('POST', `/api/sessions/${sessionId}/start`);
    console.log('   Start OK');
  } catch (e) {
    console.warn('   Start:', e.message);
  }
} else {
  console.log('3. Sesión ya ready — skip start');
}

const webhookUrl = `${cod10Url}/api/bot/webhook`;
const hooks = await json('GET', `/api/sessions/${sessionId}/webhooks`);
const hasHook = hooks.some((h) => h.url === webhookUrl && h.active);

if (!hasHook) {
  console.log('4. Registrando webhook…');
  const wh = await json('POST', `/api/sessions/${sessionId}/webhooks`, {
    url: webhookUrl,
    events: ['message.received'],
    secret: webhookSecret,
  });
  console.log('   Webhook ID:', wh.id);
} else {
  console.log('4. Webhook ya registrado →', webhookUrl);
}

console.log('\n=== Resultado ===');
console.log('OPENWA_SESSION_ID=' + sessionId);
console.log('Webhook →', webhookUrl);
console.log('\nSiguiente: pega OPENWA_SESSION_ID en Vercel/admin, escanea QR si hace falta, prueba /api/bot/diag');
