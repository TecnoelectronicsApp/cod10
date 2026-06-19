# Atlas + Render + Vercel — despliegue en 5 pasos

Proyecto Atlas: [cloud.mongodb.com — Codigo 10](https://cloud.mongodb.com/v2/6a35c98d6473330512f42634#/overview)

## Paso 1 — Atlas (2 min)

1. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
2. **Database** → tu cluster → **Connect** → **Drivers** → Node.js
3. Copia el **host** de la cadena, ejemplo:
   ```
   cluster0.a1b2c3.mongodb.net
   ```
   (No copies la URI con `<password>` — usa tu clave real solo en `.env` o Render)

## Paso 2 — Seed local (opcional, verifica que Atlas funciona)

PowerShell en la raíz del repo:

```powershell
$env:ATLAS_PASSWORD="TU_CLAVE"
node scripts/setup-atlas.mjs cluster0.xxxxx.mongodb.net
```

Crea `services/cod10-api/.env` automáticamente y carga productos + admin.

**Admin:** `admin@codigo10.com` / `codigo10admin`

## Paso 3 — Render (API GraphQL, gratis)

1. [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance**
2. Conecta repo **TecnoelectronicsApp/cod10**
3. Render detecta `render.yaml` → servicio **cod10-graphql**
4. Variables secretas en Render:
   - `MONGODB_URI` = misma URI de Atlas (con clave real)
   - `ADMIN_PASSWORD` = clave admin que quieras en producción
5. **Apply** → espera deploy → URL: `https://cod10-graphql.onrender.com`
6. Prueba: `https://cod10-graphql.onrender.com/health`

> La API hace **seed automático** la primera vez que arranca con BD vacía.

## Paso 4 — Vercel (cliente + admin)

El push a `main` redeploya automáticamente si Vercel está conectado a GitHub.

URLs ya configuradas en `vercel.json`:

| App | URL GraphQL |
|-----|-------------|
| Cliente | `https://cod10-graphql.onrender.com/graphql` |
| Admin | `https://cod10-graphql.onrender.com/` |

Si usas otro nombre en Render, actualiza las 3 URLs en:
- `vercel.json`
- `platform/vercel.json`
- `Admin Dashboard/vercel.json`

## Paso 5 — Verificar

- Cliente: https://cod10.vercel.app → menú con productos
- Admin: https://cod10-admin.vercel.app → login admin
- Pedidos: crear uno de prueba en checkout

## Seguridad

- **No subas** `.env` con claves a git (ya está en `.gitignore`)
- Cambia la clave de Atlas si la compartiste en chat
- En producción usa `JWT_SECRET` fuerte (Render lo genera solo)
