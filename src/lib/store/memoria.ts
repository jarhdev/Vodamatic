import type { Celda, Filas, Store, Tabla } from "./esquema";

type Datos = { [K in Tabla]: Filas[K][] };

/** Store en memoria para el modo demo y los tests. Se reinicia al reiniciar el servidor. */
export class MemoriaStore implements Store {
  datos: Datos;
  pestañas = new Map<string, Celda[][]>();

  constructor(inicial: Partial<Datos> = {}) {
    this.datos = {
      productos: [], ventas: [], detalleVentas: [], gastos: [], detalleGastos: [], movimientos: [], tasas: [], usuarios: [],
      ...structuredClone(inicial),
    } as Datos;
  }

  async listar<T extends Tabla>(tabla: T): Promise<Filas[T][]> {
    return structuredClone(this.datos[tabla]);
  }

  async agregar<T extends Tabla>(tabla: T, filas: Filas[T][]): Promise<void> {
    (this.datos[tabla] as Filas[T][]).push(...structuredClone(filas));
  }

  async actualizar<T extends Tabla>(tabla: T, donde: (f: Filas[T]) => boolean, cambios: Partial<Filas[T]>): Promise<number> {
    let n = 0;
    for (const f of this.datos[tabla] as Filas[T][]) {
      if (donde(f)) {
        Object.assign(f as object, cambios);
        n++;
      }
    }
    return n;
  }

  async escribirPestaña(pestaña: string, filas: Celda[][]): Promise<void> {
    this.pestañas.set(pestaña, filas);
  }
}
