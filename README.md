# CAJAflow

MVP local para control de caja abierta y cierre de turnos.

## Ejecutar

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Cliente: http://localhost:5173  |  API: http://localhost:3001

En local la persistencia usa `server/data/espacios.json`. En producción son obligatorias `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; la API no usa los JSON locales como fallback. Podés comprobar el almacenamiento activo en `GET /api/health`.
