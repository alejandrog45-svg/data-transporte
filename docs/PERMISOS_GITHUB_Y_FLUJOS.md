# Permisos y separación de flujos

Actualizado: 2026-10-08

## Repositorio

Este documento corresponde únicamente a `alejandrog45-svg/data-transporte`.
El proyecto `marcas-transporte-ops` es otro repositorio y utiliza Firebase para
el panel; no debe mezclarse con este flujo de actualización de datos.

## Conector de código ChatGPT

Para trabajar sobre este repositorio, la instalación de GitHub debe permitir:

- Repository `alejandrog45-svg/data-transporte`.
- Metadata: lectura.
- Contents: lectura y escritura, para actualizar el workflow o archivos autorizados.
- Actions/workflows: lectura y escritura, para revisar y relanzar ejecuciones.

No se requieren permisos de administración de la organización, administración de
secretos, eliminación de repositorios, Firebase ni Google Ads.

## Workflow `Actualizar datos`

El workflow usa el permiso temporal:

```yaml
permissions:
  contents: write
```

Ese permiso solo permite que el bot publique `data/data.json` y `docs/data.json`
cuando el ETL termina correctamente. No permite modificar campañas ni cuentas de
Google Ads.

## Secretos de Actions

Los valores nunca deben guardarse en el repositorio ni en este documento.

- `VIAJES_SHEET_ID`: obligatorio; identifica la planilla de viajes de solo lectura.
- `FIN_WEBAPP_URL`: opcional; URL de solo lectura para datos financieros.

`FIREBASE_SERVICE_ACCOUNT` pertenece al workflow del panel en
`marcas-transporte-ops`; no es necesario para `Actualizar datos`.

## Diagnóstico del fallo del 2026-10-08

La descarga de ambas fuentes terminó correctamente. El error ocurrió durante
`scripts/etl.py` o `scripts/build_site.py`. El workflow ocultaba el detalle con
`> /dev/null`; la corrección elimina esa redirección y activa `PYTHONUNBUFFERED`
para que el siguiente registro muestre la causa real.

