# MEMORIA DEL PROYECTO — Food Delivery Single Vendor

> **OBLIGATORIO:** Leer este archivo completo al inicio de cada solicitud antes de actuar.
> Actualizar este archivo al finalizar cualquier cambio relevante.

**Última actualización:** 2026-06-20 (Google Maps checkout obligatorio, fix ApiTargetBlockedMapError)  
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

**Backend:** API propia **`services/cod10-api/`** + copia embebida en Vercel **`platform/src/lib/cod10-api-src/`** (GraphQL + MongoDB Atlas, 100% libre). La demo Enatega ya no es necesaria.

| Entorno | GraphQL |
|---------|---------|
| **Producción (principal)** | https://cod10.vercel.app/api/graphql |
| **Respaldo Render** | https://cod10-graphql.onrender.com/graphql |
| **Local** | `http://localhost:4000/graphql` (`npm run dev:api`) |

- Health: https://cod10.vercel.app/api/health
- MongoDB Atlas: cluster `cluster0.rhmrgxr.mongodb.net`, DB `cod10`
- Demo legacy (inestable, obsoleta): `https://enatega-singlevendor.up.railway.app/graphql`

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
| GraphQL producción | https://cod10.vercel.app/api/graphql |

**Credenciales admin producción:**
- `admin@codigo10.com` / `codigo10admin` (principal)
- `admin@enatega.com` / `enatega123` (compatibilidad con el formulario del admin Enatega)

---

## 3. Desarrollo LOCAL (prioridad sobre Vercel)

**Regla:** Probar siempre en local antes de desplegar. Vercel tarda ~2–5 min por build.

### Comandos rápidos (desde la raíz del repo)

```powershell
# API propia Codigo 10 (reemplaza demo Enatega)
npm run install:api
npm run dev:api
npm run seed:api
npm run setup:atlas

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

### 2026-06-20 — Efectivo: denominación del billete y vuelto

- **Checkout:** al elegir efectivo, el cliente indica billete ($1–$100, exacto u otro monto); se valida ≥ total
- **API:** `placeOrder(cashTender)` guarda `paid_amount` = billete; vuelto = paid_amount − order_amount
- **Cocina / repartidor / Admin:** muestran billete y vuelto calculado


- **Zoom embed:** botones +/−, rueda del mouse (PC) y pellizco (móvil); niveles 14–20; pin fijo + arrastre
- **Deploy:** producción en https://cod10.vercel.app (build OK con `Array.from` para iteración Map)
- **Regla proyecto:** UX y facilidad del usuario es lo primordial (`.cursor/rules` + MEMORIA §6)

### 2026-06-20 — Envío por distancia + quitar banner embed

- **Origen delivery:** `10.490771409353307, -66.95274734821183`
- **Tarifa:** hasta 4 km → $3; cada km extra → +$0.50 (Haversine, checkout + `placeOrder` API)
- **UI:** distancia en km en resumen checkout; sin banner azul modo embed

### 2026-06-20 — Google Maps sin tarjeta (modo embed)

- **Problema:** Google exige facturación (tarjeta) para Maps JavaScript API interactivo — no hay bypass oficial
- **Solución:** modo **Google Maps embed** (iframe maps.google.com) — sigue siendo Google Maps, **sin API key ni tarjeta**
- **Checkout:** GPS + flechas ↑↓←→ para ajustar punto + coordenadas al repartidor
- **Vercel:** `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ONLY=true` activado en producción
- **Futuro:** tarjeta prepago → crear key WEB → quitar `EMBED_ONLY` para pin arrastrable

### 2026-06-20 — Google Maps checkout (obligatorio, sin alternativas)

- **Regla:** checkout usa **solo Google Maps** — prohibido Leaflet/OpenStreetMap u otro proveedor
- **Error `ApiTargetBlockedMapError`:** la key en Vercel era la de **Android** (`CustomerApp`); la web requiere key **HTTP referrer**
- **Fix código:** `@googlemaps/js-api-loader`, `LocationPicker.tsx` restaurado, eliminado Leaflet
- **Key WEB correcta:** proyecto GCP `foodapp-77e88` — misma que Admin Firebase; activar Maps JavaScript API + Geocoding API; referrers `https://cod10.vercel.app/*` y `http://localhost:3000/*`
- **Vercel:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` actualizada a key web (no Android)

### 2026-06-20 — Fix pedidos cocina / rider

- **Rider vacío:** bug en `mapOrder` al serializar `rider` como ObjectId (`assignedOrders` fallaba con error 500)
- **Cocina vacía:** cocina solo muestra `PENDING` / `ACCEPTED`; pedidos en `ASSIGNED` (asignados desde admin) no aparecen
- **Flujo correcto:** cliente pide → cocina acepta (`ACCEPTED`) → repartidor toma o admin asigna (`ASSIGNED`) → `PICKED` → `DELIVERED`
- **assignRider:** ya no permite asignar repartidor si el pedido no está en `ACCEPTED`
- **Rider login:** usuario `deli01` (Oswaldo) — ver repartidores en admin

### 2026-06-20 — Orden drag categorías/productos + fixes pedidos admin

- **Orden en menú:** campo `sort_order` en MongoDB (Category + Food); queries ordenan por `sort_order`
- **Mutaciones:** `reorderCategories(ids)` y `reorderFoods(ids)` en API (`services/cod10-api` + `platform/src/lib/cod10-api-src`)
- **Admin:** `SortableDataTable.jsx` + `utils/dragReorder.js` — arrastre con ratón (mousedown en ⠿, soltar sobre otra fila); columnas en Categoría y Productos
- **Fix arrastre:** HTML5 DnD no funcionaba dentro de `react-data-table-component`; reemplazado por drag con mouse/touch
- **Pedido ASSIGNED pantalla blanca:** faltaba query `getPaymentStatuses` en API; añadidos alias `getPaymentStatuses` / `getOrderStatuses`; defensas en `Order.jsx` (addons, riders)
- **Pedidos no visibles (admin/cliente):** `fetchPolicy: network-only`, paginación pedidos, login por teléfono unificado (`findCustomerByLogin`), usuarios sin enmascarar email/teléfono
- **Checkout:** fix `placeOrder` null en variación (`Cannot read properties of null reading '0'`)
- **Repartidores:** `RiderInput` en schema, CRUD real, contraseña en texto plano (compat Enatega admin)
- **Cupones:** campo `code` + `CouponInput`; **Calificaciones:** query `allReviews`
- **Deploy:** cod10.vercel.app + cod10-admin.vercel.app

### 2026-06-19 — Backend propio cod10-api (salir de Enatega demo)

- **`services/cod10-api/`:** Express GraphQL + MongoDB Atlas + JWT; seed Codigo 10
- **GraphQL en Vercel:** `platform/src/app/api/graphql/route.js` + copia `cod10-api-src`
- **Respaldo Render:** `cod10-graphql.onrender.com` (`render.yaml`, `ATLAS_DB_PASSWORD`)
- **CORS** para `cod10-admin.vercel.app`; precios con `discounted: 0`; checkout con JWT
- **Fallback catálogo:** `platform/public/catalog-fallback.json` + `useMenuCatalog.ts`
- **Admin env:** `REACT_APP_SERVER_URL=https://cod10.vercel.app/api/` (vercel.json + `.env.production`)
- **Docs:** `ATLAS-SETUP.md`, `SALIR-DE-ENATEGA.md`, scripts `seed:api`, `setup:atlas`, `migrate:enatega`

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
6. **Backend:** fuente de verdad `services/cod10-api`; sincronizar cambios en `platform/src/lib/cod10-api-src/` antes de deploy Vercel platform
7. **Admin GraphQL URL:** `REACT_APP_SERVER_URL=https://cod10.vercel.app/api/` (no Railway demo)
8. **Repartidores:** contraseña texto plano en BD (admin muestra y rider login); clientes usan bcrypt
9. **Orden menú:** `sort_order` en Category/Food; admin reordena con ⠿ (mouse down + soltar en fila)
10. **Pedidos admin:** paginación API desde `page: 0`; modal ASSIGNED requiere `getPaymentStatuses` en schema
11. **Imagen productos:** placeholder si falta `img_url`; listado admin usa `getFoodsList` (ligera)
12. **Login cliente teléfono:** email `@wa.cod10.app` — buscar por variantes de teléfono en `findCustomerByLogin`
13. **Google Maps checkout (OBLIGATORIO):** solo Google Maps JS; prohibido Leaflet/OSM. Key WEB con referrer HTTP (`cod10.vercel.app`, `localhost:3000`). Nunca key Android de apps móviles (`ApiTargetBlockedMapError`). GCP `foodapp-77e88`: Maps JavaScript API + Geocoding API activas.
14. **UX primordial:** priorizar facilidad del usuario (especialmente checkout/mapa: arrastrar, zoom con pellizco/+−, GPS). Sin mensajes técnicos innecesarios en pantalla.
15. **Envío por distancia:** origen `10.490771409353307, -66.95274734821183`; hasta 4 km → $3; +$0.50/km extra. Cálculo Haversine en checkout + `placeOrder`.

---

## 7. Estructura de archivos clave

```
food-delivery-singlevendor/
├── MEMORIA.md                 ← ESTE ARCHIVO (leer siempre)
├── package.json               ← scripts dev local raíz
├── services/cod10-api/        ← API GraphQL + MongoDB (Render/local)
├── vercel.json                ← config platform (root → platform/)
├── platform/                  ← Next.js web app + API GraphQL Vercel
│   ├── src/app/api/graphql/   ← route GraphQL producción
│   ├── src/lib/cod10-api-src/ ← copia sincronizada de cod10-api
│   ├── src/app/               ← rutas: /, /kitchen, /rider, /cart, etc.
│   ├── src/lib/graphql/       ← operaciones GraphQL cliente
│   ├── src/lib/bot/           ← bot WhatsApp (GraphQL + Gemini + OpenWA)
│   └── .env.local             ← vars locales (no commitear)
├── Admin Dashboard/           ← panel admin CRA
│   ├── src/views/             ← Category.jsx, Food.jsx (SortableDataTable)
│   ├── src/components/        ← SortableDataTable, Food, User, Rider, Order
│   ├── src/utils/dragReorder.js
│   ├── src/apollo/server.js   ← queries/mutations GraphQL
│   └── vercel.json            ← REACT_APP_SERVER_URL → cod10.vercel.app
├── CustomerApp/               ← Expo cliente móvil
└── RiderApp/                  ← Expo repartidor móvil
```

---

## 8. Pendientes / roadmap

- [x] Backend propio `services/cod10-api` (GraphQL + MongoDB Atlas)
- [x] GraphQL embebido en Vercel (`/api/graphql`)
- [x] Admin conectado a API propia (no Enatega demo)
- [x] Repartidores, cupones, pedidos, orden drag categorías/productos
- [ ] **API key Google Maps WEB** — el usuario debe crearla en Google Cloud (ver §10); pegar en Vercel `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] WebSocket admin (`REACT_APP_WS_SERVER_URL` — subscriptions pedidos tiempo real)
- [ ] Configurar vars bot en Vercel (`GEMINI_API_KEY`, `OPENWA_*`) y webhook OpenWA
- [ ] Apps móviles: build EAS y publicación stores
- [ ] Commit/push pendiente en GitHub de todos los cambios locales recientes

---

## 10. Guía usuario — API key Google Maps WEB (gratis para Codigo 10)

**Sí debes crear una key tú.** Las keys del repo (`CustomerApp`, `RiderApp`, Admin Enatega) son de otro proyecto o restringidas a Android — **no sirven para la web**.

### ¿Es gratis?

- Google exige **cuenta de facturación** vinculada (tarjeta), pero da **~200 USD de crédito gratis al mes** en Maps Platform.
- Un local pequeño (checkout, unos cientos de pedidos/mes) **casi nunca paga nada** dentro de ese crédito.
- Sin key WEB propia el checkout muestra: *«Usa una key WEB, no la de Android»*.

### Sin tarjeta de crédito (ahora mismo)

Google **no permite** activar Maps JavaScript API (mapa interactivo con pin) sin vincular facturación — no hay forma de saltarse eso desde código.

**Opciones reales:**

| Opción | Qué consigues | Tarjeta |
|--------|---------------|---------|
| **A. Modo embed (activo en Codigo 10)** | Mapa **Google Maps** en iframe + GPS + flechas de ajuste | **No** |
| **B. Tarjeta prepago / débito virtual** | Mapa interactivo completo (pin, clic) + Geocoding | Sí (prepago) |
| **C. Cuenta GCP de un socio** | Igual que B, facturación a nombre de otro | Ellos |

**Modo embed (A):** variable Vercel `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ONLY=true` o sin API key válida → checkout muestra Google Maps embebido sin API key. Las coordenadas se guardan igual para el repartidor.

**Cuando tengas tarjeta prepago (B):** sigue el paso a paso de abajo; quita `EMBED_ONLY` y pon tu key WEB.

### Paso a paso con facturación (mapa interactivo completo)

1. Entra a **https://console.cloud.google.com/** con tu cuenta Google.
2. Arriba: **Seleccionar proyecto** → **Proyecto nuevo** → nombre ej. `codigo-10-maps` → Crear.
3. **Facturación** (obligatorio para Maps, sigue siendo gratis en uso bajo):
   - Menú ☰ → **Facturación** → vincular cuenta de facturación a este proyecto.
4. **Activar APIs** (Menú ☰ → **APIs y servicios** → **Biblioteca**):
   - Busca y activa **Maps JavaScript API**
   - Busca y activa **Geocoding API**
5. **Crear la key WEB** (Menú ☰ → **APIs y servicios** → **Credenciales** → **+ Crear credenciales** → **Clave de API**):
   - Copia la key generada (empieza por `AIza...`).
6. **Restringir la key** (clic en la key recién creada → Editar):
   - **Restricciones de aplicación** → **Sitios web** → Añadir:
     - `https://cod10.vercel.app/*`
     - `http://localhost:3000/*`
   - **Restricciones de API** → **Restringir clave** → marcar solo:
     - Maps JavaScript API
     - Geocoding API
   - Guardar.
7. **Pegar en Vercel** (proyecto `cod10`):
   - https://vercel.com/tecnoelectronics-projects/cod10/settings/environment-variables
   - Variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = tu key `AIza...`
   - Entornos: Production, Preview, Development
   - Guardar → **Redeploy** el último deployment (Deployments → ⋮ → Redeploy).
8. **Local** (opcional): en `platform/.env.local` añadir la misma línea y reiniciar `npm run dev`.

### Probar

- Abre **https://cod10.vercel.app/checkout** (Ctrl+F5).
- Debe verse el mapa de Google con pin arrastrable.
- **No** abras `cod10.vercel.app/*` en el navegador — el `/*` solo va en Google Cloud.

### Si sigue fallando

- Consola del navegador (F12): busca `RefererNotAllowedMapError` → falta el referrer en paso 6.
- `ApiNotActivatedMapError` → activar APIs en paso 4.
- `BillingNotEnabled` → completar paso 3.

---

## 9. Instrucciones para el agente IA

1. **Leer `MEMORIA.md` al inicio de cada tarea** (regla estricta en `.cursor/rules/`)
2. **Desarrollar y probar en local** antes de cualquier deploy Vercel
3. **Actualizar sección 5 y 8** de este archivo tras cada cambio significativo
4. **Responder en español** al usuario
5. **No commitear** sin que el usuario lo pida (salvo flujo explícito)
6. **No desplegar Vercel** salvo solicitud explícita del usuario
