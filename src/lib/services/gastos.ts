import { z } from "zod";
import { hoy, horaActual } from "../fechas";
import { nuevoId } from "../ids";
import { equivalentes, redondear } from "../dinero";
import { getStore, type DetalleGasto, type Gasto, type Movimiento } from "../store";
import { tasaNegocio } from "./tasas";

export const GastoInput = z.object({
  concepto: z.string().min(1, "Falta el concepto"),
  categoria: z.string().default("Otros"),
  proveedor: z.string().default(""),
  rif: z.string().default(""),
  nroFactura: z.string().default(""),
  moneda: z.enum(["Bs", "USD"]),
  monto: z.number().positive("El monto debe ser mayor que cero"),
  metodo: z.string().default(""),
  referencia: z.string().default(""),
  tasa: z.number().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Renglones de la factura. Los que tienen productoId entran al inventario. */
  items: z
    .array(
      z.object({
        productoId: z.string().default(""),
        descripcion: z.string().min(1),
        cantidad: z.number().positive(),
        /** Costo unitario en la moneda del gasto. */
        costoUnit: z.number().min(0),
      }),
    )
    .default([]),
  sumarInventario: z.boolean().default(true),
  linkCapture: z.string().default(""),
  origen: z.string().default("webapp"),
  requestId: z.string().default(""),
});
export type GastoInput = z.input<typeof GastoInput>;

export async function registrarGasto(entrada: GastoInput, usuario: string): Promise<Gasto> {
  const g = GastoInput.parse(entrada);
  const store = getStore();

  if (g.requestId) {
    const previo = (await store.listar("gastos")).find((x) => x.requestId === g.requestId);
    if (previo) return previo;
  }

  const tasa = g.tasa ?? (await tasaNegocio()).valor;
  const fecha = g.fecha ?? hoy();
  const hora = horaActual();
  const id = nuevoId("G");
  const aUsd = (n: number) => (g.moneda === "USD" ? n : n / tasa);

  const gasto: Gasto = {
    id, fecha, hora, concepto: g.concepto, categoria: g.categoria, proveedor: g.proveedor, rif: g.rif, nroFactura: g.nroFactura,
    moneda: g.moneda, monto: redondear(g.monto), tasa, ...equivalentes(g.monto, g.moneda, tasa), metodo: g.metodo, referencia: g.referencia,
    registradoPor: usuario, origen: g.origen, linkCapture: g.linkCapture, anulado: "", requestId: g.requestId,
  };

  const detalle: DetalleGasto[] = g.items.map((i) => ({
    gastoId: id, fecha, productoId: i.productoId, descripcion: i.descripcion, cantidad: i.cantidad,
    costoUnitUsd: redondear(aUsd(i.costoUnit), 4), subtotalUsd: redondear(aUsd(i.costoUnit * i.cantidad)), anulado: "",
  }));

  const productos = await store.listar("productos");
  const entradas: Movimiento[] = g.sumarInventario
    ? detalle.flatMap((d) => {
        const p = productos.find((x) => x.id === d.productoId);
        if (!p || p.controlaStock !== "sí") return [];
        return [{
          id: nuevoId("M"), fecha, hora, productoId: p.id, producto: p.nombre, tipo: "entrada", cantidad: d.cantidad,
          costoUnitUsd: d.costoUnitUsd, origen: "gasto", referencia: id, nota: g.proveedor, registradoPor: usuario, anulado: "",
        }];
      })
    : [];

  await store.agregar("gastos", [gasto]);
  await store.agregar("detalleGastos", detalle);
  await store.agregar("movimientos", entradas);
  // El último costo de compra queda como costo del producto (sirve para márgenes y valor de inventario).
  for (const e of entradas) {
    if (e.costoUnitUsd > 0) await store.actualizar("productos", (p) => p.id === e.productoId, { costoUsd: e.costoUnitUsd });
  }
  return gasto;
}

export async function anularGasto(gastoId: string, usuario: string) {
  const store = getStore();
  const marca = `sí (${usuario}, ${hoy()})`;
  const n = await store.actualizar("gastos", (g) => g.id === gastoId && !g.anulado, { anulado: marca });
  if (!n) throw new Error("Gasto no encontrado o ya anulado");
  await store.actualizar("detalleGastos", (d) => d.gastoId === gastoId, { anulado: marca });
  await store.actualizar("movimientos", (m) => m.referencia === gastoId, { anulado: marca });
}
