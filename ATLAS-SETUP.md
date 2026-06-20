# Atlas + Render + Vercel — despliegue en 5 pasos

Proyecto Atlas: [cloud.mongodb.com — Project 0](https://cloud.mongodb.com/v2/6a35c98d6473330512f42634#/overview)

## ✅ Atlas — ya configurado

| Dato | Valor |
|------|--------|
| Cluster | **Cluster0** |
| Host SRV | `cluster0.rhmrgxr.mongodb.net` |
| Base de datos | `cod10` |
| Usuario DB | `tecnosoftwareapp_db_user` |
| Seed | ✅ 4 categorías, 8 productos, admin |

**Admin API:** `admin@codigo10.com` / `codigo10admin`

### Si Render no conecta — abrir red

**Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)

---

## Paso 1 — Render (API pública, ~3 min)

1. [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance** (o **Manual sync** si ya existe)
2. Repo **TecnoelectronicsApp/cod10**
3. Servicio **cod10-graphql**
4. **Solo una variable secreta obligatoria:**
   - `ATLAS_DB_PASSWORD` = clave del usuario `tecnosoftwareapp_db_user` en Atlas

   (Host, usuario y BD ya vienen en `render.yaml`)

   Alternativa: `MONGODB_URI` completa si prefieres una sola variable.

5. **Apply / Sync** → URL: `https://cod10-graphql.onrender.com`
6. Prueba: `https://cod10-graphql.onrender.com/health` → `{ "ok": true, "mongo": true, "ready": true }`

> Primera vez puede tardar ~2 min (plan free). La API hace seed automático si la BD está vacía.

---

## Paso 2 — Vercel (cliente + admin)

Ya apuntan a `https://cod10-graphql.onrender.com` en `vercel.json`.

Tras Render activo, redeploy si hace falta:
- https://cod10.vercel.app
- https://cod10-admin.vercel.app

---

## Paso 3 — Verificar

| Qué | URL |
|-----|-----|
| Menú cliente | https://cod10.vercel.app |
| Admin | https://cod10-admin.vercel.app |
| API health | https://cod10-graphql.onrender.com/health |
| GraphQL | https://cod10-graphql.onrender.com/graphql |

---

## Desarrollo local

```powershell
npm run dev:api       # API → localhost:4000
npm run dev:platform  # Cliente → localhost:3000
npm run dev:admin     # Admin → localhost:3006
```

`.env` en `services/cod10-api/` (no se sube a git).

---

## Seguridad

- Rota la clave de Atlas si la compartiste en chat
- `JWT_SECRET` lo genera Render automáticamente
- No commitear `.env`
