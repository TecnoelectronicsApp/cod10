/**
 * Configura MongoDB Atlas y ejecuta seed.
 *
 * Uso (pega el host del cluster desde Atlas → Connect → Drivers):
 *   node scripts/setup-atlas.mjs cluster0.xxxxx.mongodb.net
 *
 * O define MONGODB_URI completa en services/cod10-api/.env
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, 'services/cod10-api/.env');
const examplePath = path.join(root, 'services/cod10-api/.env.example');

const clusterHost = process.argv[2]?.trim();
const user = process.env.ATLAS_USER || 'tecnosoftwareapp_db_user';
const pass = process.env.ATLAS_PASSWORD || process.env.MONGODB_PASSWORD;
const db = process.env.ATLAS_DB || 'cod10';

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function buildUri(host, password) {
  const encoded = encodeURIComponent(password);
  return `mongodb+srv://${user}:${encoded}@${host}/${db}?retryWrites=true&w=majority&appName=Codigo10`;
}

const env = loadEnv();
let uri = env.MONGODB_URI || process.env.MONGODB_URI;

if (!uri && clusterHost && pass) {
  uri = buildUri(clusterHost, pass);
  const base = existsSync(examplePath) ? readFileSync(examplePath, 'utf8') : '';
  const lines = base.split('\n').filter((l) => !l.startsWith('MONGODB_URI='));
  lines.push(`MONGODB_URI=${uri}`);
  writeFileSync(envPath, `${lines.join('\n').trim()}\n`, 'utf8');
  console.log('[setup-atlas] .env actualizado (no se sube a git)');
}

if (!uri) {
  console.log(`
=== MongoDB Atlas — 2 minutos ===

1. Abre tu proyecto: https://cloud.mongodb.com/v2/6a35c98d6473330512f42634#/overview

2. Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)

3. Database → Connect → Drivers → copia el host, ej:
   cluster0.xxxxx.mongodb.net

4. Ejecuta (con tu clave):
   set ATLAS_PASSWORD=tu_clave
   node scripts/setup-atlas.mjs cluster0.xxxxx.mongodb.net

   O pega la URI completa en services/cod10-api/.env:
   MONGODB_URI=mongodb+srv://tecnosoftwareapp_db_user:CLAVE@cluster0.xxxxx.mongodb.net/cod10?retryWrites=true&w=majority

5. Render.com → Blueprint → repo cod10 → variable MONGODB_URI (misma URI)
`);
  process.exit(1);
}

console.log('[setup-atlas] Probando conexión…');
const test = spawnSync('node', ['scripts/test-atlas-connection.mjs', uri], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, MONGODB_URI: uri },
});
if (test.status !== 0) process.exit(test.status ?? 1);

console.log('[setup-atlas] Ejecutando seed…');
const seed = spawnSync('npm', ['run', 'seed:api'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, MONGODB_URI: uri },
  shell: true,
});
process.exit(seed.status ?? 0);
