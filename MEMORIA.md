# MEMORIA DEL PROYECTO — Food Delivery Single Vendor

> **OBLIGATORIO:** Leer este archivo completo al inicio de cada solicitud antes de actuar.
> Actualizar este archivo al finalizar cualquier cambio relevante.

**Última actualización:** 2026-06-19 (brand front platform + deploy)  
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

**Backend:** API propia **`services/cod10-api/`** (GraphQL + MongoDB, 100% libre). La demo Enatega ya no es necesaria.

- API local: `http://localhost:4000/graphql`
- Demo legacy (inestable): `https://enatega-singlevendor.up.railway.app/graphql`

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

### 2026-06-19 — Bot WhatsApp + Gemini + OpenWA (integración MongoDB)

- **Platform API routes** (`platform/src/app/api/bot/`):
  - `GET /api/bot/catalog` — productos desde MongoDB vía GraphQL Enatega + Pagomóvil/BCV
  - `GET /api/bot/context` — contexto texto para Gemini
  - `POST /api/bot/webhook` — webhook OpenWA → Gemini → respuesta WhatsApp
  - `GET /api/bot/health` — health check
- **Lib bot:** `platform/src/lib/bot/` (graphql, catalog, gemini, openwa)
- **Fuente de datos:** misma API GraphQL Railway + BCV API (`/store-config`, `/usd`) — sin PostgreSQL duplicado
- **OpenWA:** plugin `cod10-gemini` en repo OpenWA lee `/api/bot/catalog` de cod10.vercel.app
- **Script webhook:** `scripts/setup-openwa-webhook.mjs`
- **Vars Vercel platform:** `GEMINI_API_KEY`, `OPENWA_*`, `BOT_API_KEY`, `WEBHOOK_SECRET`

### 2026-06-19 — Multimoneda BCV + métodos de pago + checkout

- **Platform:** precios `$6.00 / Bs.XXX` con tasa BCV automática (caché 1h)
- **Checkout:** subtotal + costo de envío + total en USD y Bs; selector de método de pago
- **Admin → Configuración → Métodos de pago:** Efectivo, Punto de venta, Pagomóvil (banco/teléfono/cédula), Binance
- **API BCV:** endpoints `GET/PUT /store-config` para sincronizar métodos con el cliente
- **Fallback cliente:** `platform/public/cod10-store-config.json`
- **Pedidos admin:** estados traducidos (Recogido, Entregado, Pagado, Asignar…)

### 2026-06-19 — Front cliente Codigo 10 (platform)

- Banner hero del menú restaurado: «¡Pide tu comida favorita!» + entrega a domicilio
- Eliminados enlaces Cocina, Repartidor y Admin del front público (rutas `/kitchen` y `/rider` siguen activas por URL directa)
- Metadata actualizada sin referencias a cocina/repartidor

### 2026-06-19 — Eliminar habilitado en admin

- **Causa:** Enatega demo deshabilitaba delete con aviso "adquirir producto completo" (mutaciones comentadas)
- **Fix:** Productos, categorías, opciones, complementos, cupones y repartidores — delete real con confirmación
- **Usuarios:** API demo no expone `deleteUser`; botón Info se mantiene

### 2026-06-19 — Fix definitivo guardado productos (MongoDB / Pool destroyed)

- **Causa real:** Tras `createFood`/`editFood`, Apollo ejecutaba `refetchQueries` con la query pesada `getFoods` (variations → addons → options). Un producto corrupto en la API demo (índice ~19) rompe esa query → error `connection ... mongodb closed` / `Pool was force destroyed` **aunque el producto sí se guardó**.
- **Fix:**
  - Nueva query ligera `getFoodsList` (sin variations/addons) para tabla y refetch
  - Nueva query `foodByIds` para cargar detalle al editar
  - Eliminado `refetchQueries` en mutación de Food; refresh manual vía `onSaved()`
  - `utils/graphqlError.js`: deduplicar errores + reintento 3× ante fallos transitorios MongoDB
  - `Category.jsx`: refetch usa `getFoodsList` en lugar de `getFoods`
- **Verificado:** query pesada falla en API; query ligera y build admin OK
- **Limitación:** API demo compartida sigue siendo inestable; el admin ya no dispara la query que provoca el error al guardar

### 2026-06-19 — Fix traducciones

### 2026-06-19 — Cocina Codigo 10 (KDS)
- Título: **Cocina Codigo 10** (antes "Cocina — KDS")
- Fix pedidos no visibles: `allOrders(page: 0)` — la API usa paginación desde 0, no 1
- Botón Actualizar con contador 10s→0 y auto-refresh
- Campanilla (Web Audio) al llegar pedido nuevo (subscription + detección en polling)

### 2026-06-19 — Marca Codigo 10 + fix guardado productos
- Logo `codigo10.png` en sidebar admin, platform Nav y notificaciones
- Textos visibles "Enatega" → "Codigo 10" (sin tocar localStorage ni credenciales API)
- Mutación createFood/editFood simplificada + reintento ante error MongoDB

### 2026-06-19 — Tasa BCV automática (multimoneda)
- Integración con [bcv-usd-api](https://github.com/alfredoiagarc/bcv-usd-api) en `services/bcv-usd-api/`
- Admin consulta `GET /usd/simple` al iniciar y cada hora (caché localStorage)
- Variable `REACT_APP_BCV_API_URL` (local: `http://localhost:8000`)
- Comando: `# API propia Codigo 10 (reemplaza demo Enatega)
npm run install:api
npm run dev:api
npm run seed:api` (Python/FastAPI, puerto 8000)
- Desplegar `services/bcv-usd-api` en Railway y apuntar la variable en Vercel admin

### 2026-06-19 — Español, multimoneda USD/VES y fix dev Windows
- **Idioma español:** `translations/es.js`, idioma por defecto `es`, selector en navbar admin y login
- **Multimoneda:** panel Configuración → Multimoneda (USD + Bs/VES, tasa de cambio en localStorage)
- **Moneda VES** añadida a `config/currencies.js`; accesos rápidos USD/VES en Configuración → Moneda
- **Pedidos:** precios muestran `$10.00 (Bs.365.00 VES)` cuando multimoneda está activa
- **Fix Windows:** `PORT=3006` y `NODE_OPTIONS=--openssl-legacy-provider` en `.env.development` (Node 22 + react-scripts 2.x)

### 2026-06-19 — Fix listado productos admin (img_url null)
- **Causa:** productos guardados sin imagen quedaban con `img_url: null` en MongoDB; la query `foods { img_url }` fallaba entera → tabla vacía + error GraphQL
- **Fix Food.jsx:** `resolveFoodImageUrl()` siempre envía URL válida (placeholder si no hay imagen); eliminado `successSetter('')` al guardar
- **Fix views/Food.jsx:** mensaje de error sin backticks literales
- **Script:** `npm run fix:food-images` → `scripts/fix-null-food-images.mjs` (repara productos rotos en API demo)
- **Reparados en API:** 5 productos "Cafe" con img_url null + 2 previos manualmente

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
7. **Imagen productos:** obligatoria (`img_url` non-nullable en GraphQL). Si falta imagen, usar placeholder `https://placehold.co/600x400/f97316/ffffff?text=Comida`. Nunca enviar `img_url` vacío. Si la tabla Food no carga: `npm run fix:food-images`
8. **Listado productos admin:** usar siempre `getFoodsList` (ligera). NO usar `getFoods` con variations/addons en refetch ni en tabla — rompe contra API demo

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
│   ├── src/lib/bot/           ← bot WhatsApp (GraphQL + Gemini + OpenWA)
│   ├── src/app/api/bot/       ← API routes bot para Vercel
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

- [x] Backend propio `services/cod10-api` (GraphQL + MongoDB, libre)
- [ ] Desplegar cod10-api + MongoDB en servidor del cliente
- [ ] Configurar vars bot en Vercel (`GEMINI_API_KEY`, `OPENWA_*`) y registrar webhook OpenWA
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
