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

La persistencia vive en `server/data/cajas.json` y se crea automáticamente al iniciar la API.
