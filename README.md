# CAJAEuropa

MVP local para control de caja abierta y cierre de turnos.

## Ejecutar

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Cliente: http://localhost:5173  |  API: http://localhost:3001

En producción son obligatorias `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; la API no usa archivos locales como fallback y se niega a iniciar si faltan. Podés comprobar el almacenamiento activo en `GET /api/health`.

CREATE TABLE movimientos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caja_desde_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE RESTRICT,
    caja_hasta_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE RESTRICT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    monto NUMERIC(14,2) NOT NULL,
    es_ahorro BOOLEAN NOT NULL DEFAULT FALSE,
    cuenta_x_turno_id BIGINT NOT NULL REFERENCES cuentas_x_turno(id)
        ON DELETE RESTRICT,
    notas TEXT,

    CHECK (caja_desde_id <> caja_hasta_id)
);

CREATE TABLE dinero_encontrado (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_x_turno_id BIGINT NOT NULL REFERENCES cuentas_x_turno(id)
        ON DELETE RESTRICT,
    monto NUMERIC(14,2) NOT NULL,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);