const URL = 'https://cod10-graphql.onrender.com/health';
const MAX = 12;

async function check(n) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 300000);
  try {
    const res = await fetch(URL, { signal: ctrl.signal });
    const text = await res.text();
    console.log(`[${n}] ${res.status}`, text.slice(0, 300));
    if (res.ok && text.includes('"mongo":true')) return true;
    if (res.ok && text.includes('"mongo": true')) return true;
  } catch (e) {
    console.log(`[${n}] error:`, e.message);
  } finally {
    clearTimeout(t);
  }
  return false;
}

for (let i = 1; i <= MAX; i++) {
  const ok = await check(i);
  if (ok) {
    console.log('API LISTA');
    process.exit(0);
  }
  if (i < MAX) {
    console.log('Esperando 25s (cold start Render)...');
    await new Promise((r) => setTimeout(r, 25000));
  }
}
process.exit(1);
