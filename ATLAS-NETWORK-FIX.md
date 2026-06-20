# ⚠️ PASO OBLIGATORIO — Atlas Network Access

Vercel y Render **no pueden conectar** hasta que abras la red en Atlas.

## Error que verás

```
Could not connect to any servers in your MongoDB Atlas cluster...
IP that isn't whitelisted
```

## Solución (30 segundos)

1. Abre: [Atlas → Network Access](https://cloud.mongodb.com/v2/6a35c98d6473330512f42634#/security/network/accessList)
2. **Add IP Address**
3. Elige **Allow Access from Anywhere**
4. Confirma `0.0.0.0/0`
5. Espera ~1 minuto

## Verificar

```powershell
node scripts/test-production-stack.mjs
```

Debe terminar con: `✅ TODO OK — API producción funcionando`

O en navegador: https://cod10.vercel.app/api/health

```json
{ "ok": true, "mongo": true, "ready": true }
```
