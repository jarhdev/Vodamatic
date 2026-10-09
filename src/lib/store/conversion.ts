import { aNumero } from "../dinero";
import { normalizarFecha } from "../fechas";
import { TABLAS, type Celda, type Filas, type Tabla } from "./esquema";

const CAMPOS_FECHA = new Set(["fecha", "fechaEsperada", "fechaPago", "semana", "creado"]);

/** Convierte una fila cruda del Sheet (según sus encabezados) en un objeto tipado. */
export function desdeCeldas<T extends Tabla>(tabla: T, encabezados: string[], celdas: unknown[]): Filas[T] {
  const def = TABLAS[tabla];
  const obj: Record<string, Celda> = {};
  for (const [clave, titulo] of Object.entries(def.columnas) as [string, string][]) {
    const i = encabezados.indexOf(titulo);
    const crudo = i >= 0 ? celdas[i] : "";
    if ((def.numericas as string[]).includes(clave)) obj[clave] = aNumero(crudo);
    else if (CAMPOS_FECHA.has(clave) && crudo !== "" && crudo != null) obj[clave] = normalizarFecha(crudo);
    else obj[clave] = crudo == null ? "" : String(crudo);
  }
  return obj as unknown as Filas[T];
}

/** Ordena los valores de un objeto según los encabezados del Sheet (columnas desconocidas quedan como estaban). */
export function haciaCeldas<T extends Tabla>(tabla: T, encabezados: string[], fila: Partial<Filas[T]>, previa: unknown[] = []): Celda[] {
  const def = TABLAS[tabla];
  const porTitulo = new Map<string, string>();
  for (const [clave, titulo] of Object.entries(def.columnas) as [string, string][]) porTitulo.set(titulo, clave);
  return encabezados.map((titulo, i) => {
    const clave = porTitulo.get(titulo);
    if (clave && clave in fila) {
      const v = (fila as Record<string, unknown>)[clave];
      return v == null ? "" : (v as Celda);
    }
    const p = previa[i];
    return p == null ? "" : (p as Celda);
  });
}

export function encabezadosDe(tabla: Tabla): string[] {
  return Object.values(TABLAS[tabla].columnas) as string[];
}
