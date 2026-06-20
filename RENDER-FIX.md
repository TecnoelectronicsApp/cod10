# ⚠️ Fix urgente Render — 1 minuto

## Error detectado (confirmado en producción)

```json
{
  "mongo": false,
  "error": "Falta ATLAS_DB_PASSWORD en Render → Environment"
}
```

La API **está desplegada y responde**, pero Render no tiene la clave de Atlas.

---

## Solución (3 clics)

1. Abre **[Render Dashboard](https://dashboard.render.com/)** → servicio **`cod10-graphql`**
2. Pestaña **Environment** → **Add Environment Variable**
3. Agrega:

| Key | Value |
|-----|--------|
| `ATLAS_DB_PASSWORD` | tu clave de `tecnosoftwareapp_db_user` en Atlas |

4. **Save Changes** → Render redeploya solo (~2 min)

---

## Verificar

```
https://cod10-graphql.onrender.com/health
```

Debe mostrar:
```json
{ "ok": true, "mongo": true, "ready": true, "error": null }
```

Luego prueba local:
```powershell
node scripts/test-production-stack.mjs
```

---

## Si el blueprint vuelve a pedir secretos al hacer Sync

Solo necesitas ingresar **`ATLAS_DB_PASSWORD`**.  
Host, usuario y BD ya están en `render.yaml`:
- `cluster0.rhmrgxr.mongodb.net`
- `tecnosoftwareapp_db_user`
- `cod10`
