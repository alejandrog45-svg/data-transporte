# Data Transporte — Análisis de negocio

Dashboard de análisis de una empresa de transfers aeropuerto (Santiago): ventas, viajes, clientes, sectores, costos y oportunidades de marketing.

- **Sitio público:** se publica desde `docs/` con GitHub Pages. Solo muestra datos agregados (sin nombres ni teléfonos).
- **Diseño:** generado en Google Stitch (`diseno/stitch-export/`, sistema "Andean Fleet Intelligence").

## Flujo de datos
1. `scripts/etl.py` lee los Excel (viajes y ventas/gastos), normaliza medios de pago, conductores y sectores, elimina duplicados exactos y genera `data/data.json`.
2. `scripts/build_site.py` arma `docs/` (HTML + `app.js` + `data.json`).
3. Los datos con nombre/teléfono quedan solo en `data/privado/` (ignorado por git).

## Uso local
```
E:\python-portable\python.exe scripts\etl.py
E:\python-portable\python.exe scripts\build_site.py
```
