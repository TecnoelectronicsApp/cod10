# Codigo 10 API — Backend propio (100% libre)

Reemplaza la API demo de Enatega. GraphQL + MongoDB + JWT.

## Requisitos

- Node.js 18+
- MongoDB (local o en tu servidor)

## Instalación rápida

```powershell
cd services/cod10-api
copy .env.example .env
npm install
npm run seed
npm run dev
```

API en: **http://localhost:4000/graphql**

## Credenciales admin (seed)

| Campo | Valor |
|-------|--------|
| Email | `admin@codigo10.com` |
| Clave | `codigo10admin` |

## Conectar Admin y Cliente

### Desarrollo local

**Admin** (`Admin Dashboard/.env.development`):

```env
REACT_APP_SERVER_URL=http://localhost:4000/
REACT_APP_WS_SERVER_URL=ws://localhost:4000/
```

**Cliente** (`platform/.env.local`):

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_GRAPHQL_URL=ws://localhost:4000/graphql
```

Luego:

```powershell
npm run dev:api      # terminal 1 — API
npm run dev:admin    # terminal 2 — admin :3006
npm run dev:platform # terminal 3 — cliente :3000
```

### Producción (tu servidor robusto)

1. Instala MongoDB en tu servidor (solo red interna, no expongas el puerto 27017 a internet).
2. Copia `services/cod10-api` al servidor.
3. Configura `.env` con `MONGODB_URI=mongodb://127.0.0.1:27017/cod10`.
4. Ejecuta `npm run seed` una vez.
5. Arranca con PM2: `pm2 start src/index.js --name cod10-api`.
6. Expón la API con **Nginx + HTTPS** o **Cloudflare Tunnel** → `https://api.tudominio.com`.
7. En Vercel (admin + cliente) cambia las URLs GraphQL a tu API pública.

## Migrar datos desde demo Enatega (opcional)

Si la demo responde momentáneamente:

```powershell
npm run migrate:enatega
```

## Health check

`GET http://localhost:4000/health`
