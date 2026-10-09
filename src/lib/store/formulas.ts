import { TABLAS, type Filas, type Tabla } from "./esquema";
import { letraColumna } from "./sheets";

/**
 * Pestañas "Resumen" y "Stock" del Google Sheet, hechas solo de fórmulas sobre las pestañas de datos.
 * Se recalculan solas cuando la app (o el dueño) agrega filas. Supone las columnas en el orden del esquema,
 * que es como las crea scripts/setup-sheet.ts.
 */
function col<T extends Tabla>(tabla: T, clave: keyof Filas[T]): string {
  const i = Object.keys(TABLAS[tabla].columnas).indexOf(clave as string);
  if (i < 0) throw new Error(`Columna ${String(clave)} no existe en ${tabla}`);
  return letraColumna(i + 1);
}

/** Rango abierto de una columna desde la fila 2, con la pestaña citada: 'Ventas'!$B$2:$B */
function r<T extends Tabla>(tabla: T, clave: keyof Filas[T]): string {
  const c = col(tabla, clave);
  return `'${TABLAS[tabla].pestaña}'!$${c}$2:$${c}`;
}

export function formulasResumen(): (string | null)[][] {
  const vFecha = r("ventas", "fecha"), vTotal = r("ventas", "totalUsd"), vAnul = r("ventas", "anulado");
  const vEstado = r("ventas", "estado"), vCobrado = r("ventas", "montoUsd"), vId = r("ventas", "id");
  const gFecha = r("gastos", "fecha"), gUsd = r("gastos", "montoUsd"), gAnul = r("gastos", "anulado");
  // Las fechas se guardan como texto AAAA-MM-DD, así que se comparan como texto.
  const enV = (f: number) => `(${vFecha}>=$B${f})*(${vFecha}<=$C${f})*(${vAnul}="")`;
  const enG = (f: number) => `(${gFecha}>=$B${f})*(${gFecha}<=$C${f})*(${gAnul}="")`;
  const filaPeriodo = (nombre: string, desde: string, hasta: string, f: number) => [
    nombre, desde, hasta,
    `=SUMPRODUCT(${enV(f)}*${vTotal})`,
    `=SUMPRODUCT(${enV(f)}*(${vEstado}="pagada")*${vCobrado})`,
    `=SUMPRODUCT(${enG(f)}*${gUsd})`,
    `=D${f}-F${f}`,
    `=SUMPRODUCT(${enV(f)}*(${vId}<>""))`,
    `=IF(H${f}=0,0,D${f}/H${f})`,
  ];
  const tFecha = `'${TABLAS.tasas.pestaña}'!$${col("tasas", "fecha")}:$${col("tasas", "fecha")}`;
  const tUsd = `'${TABLAS.tasas.pestaña}'!$${col("tasas", "usd")}:$${col("tasas", "usd")}`;
  const tEur = `'${TABLAS.tasas.pestaña}'!$${col("tasas", "eur")}:$${col("tasas", "eur")}`;
  return [
    ["Resumen del negocio en USD. Esta hoja se calcula sola con fórmulas; no hace falta editarla.", null, null, null, null, null, null, null, null],
    ["Hoy", '=TEXT(TODAY(),"yyyy-mm-dd")', null, null, null, null, null, null, null],
    ["Inicio de semana (lunes)", '=TEXT(TODAY()-WEEKDAY(TODAY(),3),"yyyy-mm-dd")', null, null, null, null, null, null, null],
    ["Inicio de mes", '=TEXT(EOMONTH(TODAY(),-1)+1,"yyyy-mm-dd")', null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ["Periodo", "Desde", "Hasta", "Ventas USD", "Cobrado USD", "Gastos USD", "Ganancia USD", "Nº ventas", "Ticket promedio USD"],
    filaPeriodo("Hoy", "=$B$2", "=$B$2", 7),
    filaPeriodo("Ayer", '=TEXT(TODAY()-1,"yyyy-mm-dd")', '=TEXT(TODAY()-1,"yyyy-mm-dd")', 8),
    filaPeriodo("Esta semana", "=$B$3", "=$B$2", 9),
    filaPeriodo("Semana pasada", '=TEXT(DATEVALUE($B$3)-7,"yyyy-mm-dd")', '=TEXT(DATEVALUE($B$3)-1,"yyyy-mm-dd")', 10),
    filaPeriodo("Este mes", "=$B$4", "=$B$2", 11),
    [null, null, null, null, null, null, null, null, null],
    ["Por cobrar USD", `=SUMPRODUCT((${vEstado}="pendiente")*(${vAnul}="")*${vTotal})`, null, null, null, null, null, null, null],
    ["Ventas pendientes", `=SUMPRODUCT((${vEstado}="pendiente")*(${vAnul}=""))`, null, null, null, null, null, null, null],
    ["Tasa USD (BCV) más reciente", `=IF(COUNTA(${tFecha})<2,0,INDEX(${tUsd},COUNTA(${tFecha})))`, null, null, null, null, null, null, null],
    ["Tasa EUR (BCV) más reciente", `=IF(COUNTA(${tFecha})<2,0,INDEX(${tEur},COUNTA(${tFecha})))`, null, null, null, null, null, null, null],
  ];
}

export function formulasStock(): (string | null)[][] {
  const P = TABLAS.productos.pestaña, I = TABLAS.movimientos.pestaña;
  const pId = `'${P}'!$${col("productos", "id")}$2:$${col("productos", "id")}`;
  const pAll = `'${P}'!$A:$${letraColumna(Object.keys(TABLAS.productos.columnas).length)}`;
  const nCol = (k: keyof Filas["productos"]) => Object.keys(TABLAS.productos.columnas).indexOf(k) + 1;
  const iProd = `'${I}'!$${col("movimientos", "productoId")}:$${col("movimientos", "productoId")}`;
  const iCant = `'${I}'!$${col("movimientos", "cantidad")}:$${col("movimientos", "cantidad")}`;
  const iAnul = `'${I}'!$${col("movimientos", "anulado")}:$${col("movimientos", "anulado")}`;
  const control = `'${P}'!$${col("productos", "controlaStock")}$2:$${col("productos", "controlaStock")}`;
  const activo = `'${P}'!$${col("productos", "activo")}$2:$${col("productos", "activo")}`;
  const porId = (n: number) => `=MAP(A2:A,LAMBDA(id,IF(id="",,VLOOKUP(id,${pAll},${n},FALSE))))`;
  return [
    ["Producto id", "Producto", "Unidad", "Stock", "Stock mínimo", "Estado", "Costo USD", "Valor USD"],
    [
      `=IFNA(FILTER(${pId},${control}="sí",${activo}<>"no"))`,
      porId(nCol("nombre")),
      porId(nCol("unidad")),
      `=MAP(A2:A,LAMBDA(id,IF(id="",,SUMIFS(${iCant},${iProd},id,${iAnul},""))))`,
      porId(nCol("stockMinimo")),
      `=MAP(D2:D,E2:E,LAMBDA(s,m,IF(s="",,IF(s<=0,"Agotado",IF(s<=m,"Bajo","OK")))))`,
      porId(nCol("costoUsd")),
      `=MAP(D2:D,G2:G,LAMBDA(s,c,IF(s="",,MAX(s,0)*c)))`,
    ],
  ];
}
