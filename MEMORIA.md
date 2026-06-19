# MEMORIA DEL PROYECTO — Food Delivery Single Vendor

> **OBLIGATORIO:** Leer este archivo completo al inicio de cada solicitud antes de actuar.
> Actualizar este archivo al finalizar cualquier cambio relevante.

**Última actualización:** 2026-06-19  
**Repositorio:** https://github.com/TecnoelectronicsApp/cod10  
**Organización Vercel:** tecnoelectronics-projects

---

## 1. Qué es este proyecto

Sistema de delivery food single-vendor basado en **Enatega**. Tres apps legacy + plataforma web nueva.

| Módulo | Carpeta | Tecnología | Despliegue |
|--------|---------|------------|------------|
| **Plataforma web** (cliente, cocina, rider) | `platform/` | Next.js 14, Apollo, Tailwind | Vercel `cod10` |
| **Admin** | `Admin Dashboard/` | CRA React 16, Apollo 2 | Vercel `cod10-admin` |
| App cliente móvil | `CustomerApp/` | Expo 47 | EAS (no Vercel) |
| App repartidor móvil | `RiderApp/` | Expo 47 | EAS (no Vercel) |

**Backend:** NO incluido en el repo. API GraphQL demo compartida:
- HTTP: `https://enatega-singlevendor.up.railway.app/graphql`
- WS: `wss://enatega-singlevendor.up.railway.app/graphql`

---

## 2. URLs en producción

| App | URL |
|-----|-----|
| Cliente / Cocina / Rider (web) | https://cod10.vercel.app |
| Menú cliente | https://cod10.vercel.app/ |
| Cocina KDS | https://cod10.vercel.app/kitchen |
| Repartidor | https://cod10.vercel.app/rider |
| Admin | https://cod10-admin.vercel.app |
| Admin login | https://cod10-admin.vercel.app/#/auth/login |

---

## 3. Desarrollo LOCAL (prioridad sobre Vercel)

**Regla:** Probar siempre en local antes de desplegar. Vercel tarda ~2–5 min por build.

### Comandos rápidos (desde la raíz del repo)

```powershell
# Plataforma web (cliente + cocina + rider) — puerto 3000
npm run dev:platform

# Admin dashboard — puerto 3006
npm run dev:admin

# Build local para verificar antes de deploy
npm run build:platform
npm run build:admin
```

### Comandos manuales

```powershell
# Platform
cd platform
npm install
npm run dev
# → http://localhost:3000

# Admin
cd "Admin Dashboard"
npm install --legacy-peer-deps
npm run start:dev
# → http://localhost:3006
```

### Variables de entorno

- **Platform:** `platform/.env.local` (copiar de `platform/.env.example`)
- **Admin:** `Admin Dashboard/.env.production` (local, no commitear; usar `.env.example` como plantilla)

---

## 4. Despliegue Vercel (solo cuando el usuario lo pida o tras verificar local)

| Proyecto Vercel | Root Directory | Comando deploy |
|-----------------|----------------|----------------|
| `cod10` | `platform` | `cd platform && npx vercel deploy --prod --scope tecnoelectronics-projects` |
| `cod10-admin` | `Admin Dashboard` | `cd "Admin Dashboard" && npx vercel deploy --prod --scope tecnoelectronics-projects` |

**No desplegar automáticamente** salvo que el usuario lo solicite explícitamente.

---

## 5. Historial de cambios (cronológico)

### 2026-06-19 — Memoria, reglas y dev local
- Creado `MEMORIA.md` (este archivo)
- Creada regla Cursor `.cursor/rules/proyecto-memoria.mdc` (lectura obligatoria)
- Añadido `package.json` raíz con scripts `dev:platform`, `dev:admin`, `build:*`

### 2026-06-19 — Fix admin: productos y usuarios
- **Food.jsx:** subida Cloudinary con FormData, campo URL de imagen, placeholder, errores GraphQL visibles
- **Users.jsx:** botón "+ Add User", modal `components/User/User.jsx`, mutación `createUser`
- **Limitación documentada:** API demo NO permite `deleteUser`; usuarios demo no eliminables
- Fix Babel legacy: sin optional chaining (`?.`) en Admin Dashboard
- Deploy: `cod10-admin.vercel.app`

### 2026-06-18 — Plataforma web completa (`platform/`)
- Next.js 14: menú, carrito, checkout, login/registro, pedidos
- `/kitchen` — KDS con subscriptions, login admin
- `/rider` — pedidos asignados/disponibles, login rider
- Apollo Client 4 + graphql-ws
- Vercel proyecto `cod10` con `rootDirectory: platform`
- URL: `cod10.vercel.app`

### 2026-06-18 — Git y Vercel admin inicial
- Remoto cambiado a `TecnoelectronicsApp/cod10`
- Historial limpio (secretos eliminados: google-service-account, Stripe placeholder)
- Admin desplegado en Vercel; fixes build: sass, CSS precompilado, OpenSSL legacy provider
- Proyecto Vercel `cod10-admin`

### Estado inicial
- Fork Enatega single vendor: CustomerApp, RiderApp, Admin Dashboard
- Sin backend propio; dependencia API Railway demo

---

## 6. Decisiones técnicas importantes

1. **Admin Dashboard:** NO usar optional chaining (`?.`) — Babel de react-scripts 2.x no lo soporta bien
2. **Admin build:** `NODE_OPTIONS=--openssl-legacy-provider` en Vercel
3. **Admin npm:** siempre `--legacy-peer-deps`
4. **Admin SCSS:** importar CSS precompilado, no `.scss` en build
5. **Platform:** hooks Apollo desde `@apollo/client/react`, queries con `gql`
6. **Usuarios admin:** solo lectura + crear; eliminar requiere backend propio
7. **Imagen productos:** obligatoria (`img_url` non-nullable en GraphQL)

---

## 7. Estructura de archivos clave

```
food-delivery-singlevendor/
├── MEMORIA.md                 ← ESTE ARCHIVO (leer siempre)
├── package.json               ← scripts dev local raíz
├── vercel.json                ← config platform (root → platform/)
├── platform/                  ← Next.js web app
│   ├── src/app/               ← rutas: /, /kitchen, /rider, /cart, etc.
│   ├── src/lib/graphql/       ← operaciones GraphQL
│   └── .env.local             ← vars locales (no commitear)
├── Admin Dashboard/           ← panel admin CRA
│   ├── src/views/             ← pantallas
│   ├── src/components/        ← Food, User, Rider, etc.
│   ├── src/apollo/server.js   ← queries/mutations GraphQL
│   └── vercel.json            ← config deploy admin
├── CustomerApp/               ← Expo cliente móvil
└── RiderApp/                  ← Expo repartidor móvil
```

---

## 8. Pendientes / roadmap

- [ ] Backend propio (MongoDB + GraphQL) para control total y eliminar usuarios
- [ ] Conectar `cod10-admin` a GitHub con root `Admin Dashboard`
- [ ] Actualizar Cloudinary upload_preset si falla subida de imágenes en producción
- [ ] Apps móviles: build EAS y publicación stores

---

## 9. Instrucciones para el agente IA

1. **Leer `MEMORIA.md` al inicio de cada tarea** (regla estricta en `.cursor/rules/`)
2. **Desarrollar y probar en local** antes de cualquier deploy Vercel
3. **Actualizar sección 5 y 8** de este archivo tras cada cambio significativo
4. **Responder en español** al usuario
5. **No commitear** sin que el usuario lo pida (salvo flujo explícito)
6. **No desplegar Vercel** salvo solicitud explícita del usuario
