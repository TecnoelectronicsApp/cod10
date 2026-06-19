# Salir de Enatega — Backend 100% propio (Codigo 10)

La API demo de Enatega **no es tuya**: usa MongoDB compartido y falla con errores como `connection ... mongodb closed`. **No necesitas licencia Enatega** — el reemplazo está en `services/cod10-api/`.

## Qué ya tienes en el repo

| Componente | Ruta |
|------------|------|
| API GraphQL propia | `services/cod10-api/` |
| Menú de respaldo (sin API) | `platform/public/catalog-fallback.json` |
| Script migración demo | `npm run migrate:enatega` |

## Solución inmediata (ver productos HOY en cod10.vercel.app)

El cliente ya tiene **catálogo de respaldo**: si la API demo falla, muestra el menú desde JSON local/Cloudinary.

1. Redespliega el cliente en Vercel (push o redeploy manual).
2. Los productos se verán aunque Enatega esté caído.
3. **Pedidos y admin** siguen necesitando tu propia API (paso siguiente).

## Solución definitiva (15–30 min en tu servidor)

### 1. MongoDB

**Opción A — Tu servidor (recomendado)**

```bash
# Ubuntu/Debian
sudo apt install -y mongodb-org
sudo systemctl enable mongod && sudo systemctl start mongod
```

**Opción B — MongoDB Atlas (gratis, sin instalar nada)**

1. Crea cuenta en [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Cluster M0 gratis → Connect → cadena `mongodb+srv://...`
3. En Network Access permite `0.0.0.0/0` (o la IP de tu servidor)

### 2. API Codigo 10

```bash
cd services/cod10-api
cp .env.example .env
# Edita .env:
#   MONGODB_URI=mongodb://127.0.0.1:27017/cod10   (local)
#   MONGODB_URI=mongodb+srv://user:pass@cluster...  (Atlas)
npm install
npm run seed
npm run dev   # prueba local puerto 4000
```

**Admin seed:** `admin@codigo10.com` / `codigo10admin`

### 3. Producción en tu servidor (PM2)

```bash
npm install -g pm2
cd services/cod10-api
pm2 start src/index.js --name cod10-api
pm2 save && pm2 startup
```

Expón con **Nginx + HTTPS** o **Cloudflare Tunnel**:

```
https://api.tudominio.com/graphql  →  localhost:4000
```

### 4. Variables en Vercel

**Cliente** (`cod10.vercel.app`):

```
NEXT_PUBLIC_GRAPHQL_URL=https://api.tudominio.com/graphql
NEXT_PUBLIC_WS_GRAPHQL_URL=wss://api.tudominio.com/graphql
```

**Admin** (`cod10-admin.vercel.app`):

```
REACT_APP_SERVER_URL=https://api.tudominio.com/
REACT_APP_WS_SERVER_URL=wss://api.tudominio.com/
```

Redeploy ambos proyectos.

### 5. Migrar productos de la demo (opcional)

Si la demo responde un momento:

```powershell
npm run dev:api          # terminal 1
npm run migrate:enatega  # terminal 2
```

## Desarrollo local en Windows

1. Instala [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. O usa MongoDB Atlas con URI en `.env`
3. Terminal 1: `npm run dev:api`
4. Terminal 2: `npm run dev:platform`
5. Terminal 3: `npm run dev:admin`

`platform/.env.local` y `Admin Dashboard/.env.development` ya apuntan a `localhost:4000`.

## Health check

```
GET https://api.tudominio.com/health
→ { "ok": true, "service": "cod10-api", "mongo": true }
```

## Resumen

| Necesitas | Enatega licencia | cod10-api propio |
|-----------|------------------|------------------|
| Ver menú | ❌ Demo inestable | ✅ + fallback JSON |
| Pedidos | ❌ | ✅ |
| Admin productos | ❌ | ✅ |
| Control total | ❌ Pago | ✅ Gratis |
