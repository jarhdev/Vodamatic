# Vodamatic

WebApp estándar para emprendimientos en Venezuela (cafeterías, bodegones, distribuidores, peluquerías, panaderías…).
Se basa en la lógica de **Bombi**, pero está pensada para instalarse en muchos negocios con la misma base de código.

- **Ventas** con carrito tipo punto de venta, pago en Bs o USD, referencia, banco y cliente.
- **Lectura de capturas de pago** (Pago Móvil, transferencia, Zelle, Binance) con IA: la app llena el formulario y la persona confirma.
- **Gastos** con **lectura de facturas** (foto o PDF): proveedor, RIF, Nº de factura, renglones e IVA.
- **Inventario automático**: cada venta descuenta, cada factura de compra suma, con conteo físico, mínimos y alertas.
- **Por cobrar** (fiado): se cobra después con la tasa del día del pago.
- **Tasa BCV automática** (USD y EUR, vía dolarapi), con carga manual. Cada negocio elige si convierte con la tasa del dólar o del euro.
- **Google Sheets como base de datos**: cada negocio tiene su hoja; las pestañas `Stock` y `Resumen` se recalculan solas en cada registro.
- **Resumen**: ventas, gastos y ganancia de hoy, la semana y el mes; gráfico de 14 días; más vendidos; gastos por categoría.
- Usuarios con **PIN** (bloqueo tras 5 intentos), roles admin / usuario, anulaciones auditables (no se borra nada).
- **API** para n8n o bots (`X-Api-Key`), PWA instalable en el teléfono, modo claro y oscuro.

## Probarla en 1 minuto (modo demo)

Sin credenciales, la app arranca con datos de ejemplo de una cafetería en memoria.

```bash
npm install
npm run dev
# http://localhost:3000  ·  usuario: Demo  ·  PIN: 1234
```

## Instalar para un cliente nuevo

1. **Google Cloud** (una sola vez para todos tus clientes): crea un proyecto, activa *Google Sheets API* y *Google Drive API*,
   crea una **cuenta de servicio** y descarga su JSON.
2. **Hoja del cliente**: crea un Google Sheet vacío y compártelo como *Editor* con el `client_email` de la cuenta de servicio.
3. Copia `.env.example` a `.env` y llena `NEGOCIO_*`, `GOOGLE_SHEET_ID` (el ID de la URL de la hoja), `GOOGLE_CLIENT_EMAIL`,
   `GOOGLE_PRIVATE_KEY`, `SESSION_SECRET` (`openssl rand -hex 32`) y `ANTHROPIC_API_KEY` para leer facturas y capturas.
4. Prepara la hoja y crea el primer administrador:
   ```bash
   npm run setup:sheet -- --admin "Jose" --pin 4321          # agrega --demo para cargar productos de ejemplo
   ```
5. Despliega (Netlify o Vercel) con las mismas variables de entorno. Un sitio por cliente: `cliente.tudominio.com`.

Para guardar las fotos de facturas y capturas en Drive, crea una carpeta dentro de una **Unidad compartida**, agrega la cuenta de
servicio como *Colaborador* y pon su ID en `GOOGLE_DRIVE_FOLDER_ID` (las cuentas de servicio no tienen espacio propio en "Mi unidad").

## Cómo funcionan los montos

- Los precios se guardan en **USD**. La conversión a Bs usa la tasa BCV del día (`TASA_REFERENCIA=usd` o `eur`).
- Cada venta, gasto y cobro guarda: monto original, moneda, **tasa usada**, equivalente en USD y equivalente en Bs.
  Así los reportes en USD no cambian aunque la tasa suba después.
- Una venta "por cobrar" queda en `pendiente` y, al cobrarse, se registra con la tasa del día del pago.

## Pestañas del Google Sheet

| Pestaña | Qué guarda | ¿Se edita a mano? |
|---|---|---|
| Productos | Catálogo, precios USD, costo, stock mínimo | Sí (o desde la app) |
| Ventas / Detalle ventas | Cada venta y cada renglón vendido | No (anular desde la app) |
| Gastos / Detalle gastos | Cada gasto y los renglones de la factura | No |
| Inventario | Movimientos: entradas, salidas, ajustes | No |
| Tasas | Tasa BCV USD/EUR por día | Se puede agregar una manual |
| Usuarios | Nombre, rol, PIN cifrado | Solo estado / rol |
| Stock, Resumen | Calculadas por la app | No |

La app lee por **nombre de encabezado**, así que el dueño puede reordenar columnas o agregar columnas propias sin romper nada.

## Plantillas por rubro

`NEGOCIO_RUBRO` cambia categorías de gasto y de productos, textos ("Producto" vs "Servicio") y si los productos controlan
inventario por defecto. Se definen en `src/lib/rubros.ts`; agregar un rubro nuevo es agregar una entrada ahí.

## API para automatizaciones (n8n, bots)

Todas las rutas aceptan el header `X-Api-Key: <API_KEY>`:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/resumen` | Reporte diario (ventas, gastos, por cobrar, stock bajo) |
| GET/POST | `/api/ventas` | Listar / registrar ventas (`requestId` evita duplicados) |
| POST | `/api/ventas/:id/cobrar` · `/anular` | Cobrar una venta pendiente / anular |
| GET/POST | `/api/gastos` | Listar / registrar gastos |
| GET/POST | `/api/inventario` | Stock actual / entrada, salida o conteo |
| GET/POST | `/api/productos` | Catálogo |
| GET/POST | `/api/tasa` | Tasa del día / carga manual |
| POST | `/api/leer` | `FormData{tipo: factura\|pago, archivo}` → datos leídos por IA |

## Estructura

```
src/lib/store/      Capa de datos: esquema de pestañas, Google Sheets, memoria (demo/tests)
src/lib/services/   Reglas de negocio: ventas, gastos, inventario, tasas, resumen
src/lib/ai/         Lectura de facturas y capturas con Claude (salida estructurada)
src/app/(app)/      Pantallas: inicio, ventas, gastos, inventario, por cobrar, productos, tasa
src/app/api/        API REST
scripts/            setup-sheet.ts
tests/              Pruebas de montos, inventario, idempotencia y lectura del Sheet
```

La capa de datos es una interfaz (`Store`), así que pasar a Supabase/Postgres más adelante es escribir un adaptador nuevo sin
tocar las pantallas ni las reglas de negocio.

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm test           # pruebas
npm run lint       # chequeo de tipos
```
