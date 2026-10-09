import { z } from "zod";
import { hoy, horaActual, inicioSemana } from "../fechas";
import { nuevoId } from "../ids";
import { equivalentes, redondear } from "../dinero";
import { getStore, type DetalleVenta, type Movimiento, type Venta } from "../store";
import { tasaNegocio } from "./tasas";
import { avisarStockBajo } from "./alertas";

export const VentaInput = z.object({
  items: z
    .array(
      z.object({
        productoId: z.string().optional().default(""),
        descripcion: z.string().min(1),
        cantidad: z.number().positive(),
        precioUsd: z.number().min(0),
      }),
    )
    .min(1, "Agrega al menos un producto"),
  porCobrar: z.boolean().default(false),
  fechaEsperada: z.string().optional().default(""),
  pago: z
    .object({
      moneda: z.enum(["Bs", "USD"]),
      /** Si no viene, se asume el total exacto convertido a la moneda de pago. */
      monto: z.number().positive().optional(),
      metodo: z.string().default(""),
      banco: z.string().default(""),
      referencia: z.string().default(""),
    })
    .optional(),
  cliente: z.string().default(""),
  /** Tasa usada para esta venta. Si no viene, la del día según el negocio. */
  tasa: z.number().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  linkCapture: z.string().default(""),
  origen: z.string().default("webapp"),
  requestId: z.string().default(""),
});
export type VentaInput = z.input<typeof VentaInput>;

export async function registrarVenta(entrada: VentaInput, usuario: string): Promise<Venta> {
  const v = VentaInput.parse(entrada);
  const store = getStore();

  // Idempotencia: si el teléfono reintenta el envío, no se duplica la venta.
  if (v.requestId) {
    const previa = (await store.listar("ventas")).find((x) => x.requestId === v.requestId);
    if (previa) return previa;
  }

  const tasa = v.tasa ?? (await tasaNegocio()).valor;
  const totalUsd = redondear(v.items.reduce((s, i) => s + i.cantidad * i.precioUsd, 0));
  const fecha = v.fecha ?? hoy();
  const hora = horaActual();
  const id = nuevoId("V");

  let pago = { moneda: "USD", monto: 0, montoUsd: totalUsd, montoBs: redondear(totalUsd * tasa), metodo: "", banco: "", referencia: "" };
  if (!v.porCobrar) {
    if (!v.pago) throw new Error("Falta el pago (o marca la venta como por cobrar)");
    const monto = v.pago.monto ?? (v.pago.moneda === "USD" ? totalUsd : redondear(totalUsd * tasa));
    pago = { ...v.pago, monto, ...equivalentes(monto, v.pago.moneda, tasa) };
  }

  const productos = await store.listar("productos");
  const venta: Venta = {
    id, fecha, hora,
    items: v.items.map((i) => `${i.cantidad}x ${i.descripcion}`).join(", "),
    cantidad: v.items.reduce((s, i) => s + i.cantidad, 0),
    totalUsd, estado: v.porCobrar ? "pendiente" : "pagada",
    moneda: pago.moneda, monto: pago.monto, tasa, montoUsd: pago.montoUsd, montoBs: pago.montoBs,
    metodo: pago.metodo, banco: pago.banco, referencia: pago.referencia, cliente: v.cliente,
    fechaEsperada: v.porCobrar ? v.fechaEsperada : "", fechaPago: v.porCobrar ? "" : fecha,
    registradoPor: usuario, origen: v.origen, linkCapture: v.linkCapture, anulado: "", requestId: v.requestId,
  };

  const detalle: DetalleVenta[] = v.items.map((i) => ({
    ventaId: id, fecha, semana: inicioSemana(fecha), productoId: i.productoId, producto: i.descripcion,
    cantidad: i.cantidad, precioUsd: i.precioUsd, subtotalUsd: redondear(i.cantidad * i.precioUsd), anulado: "",
  }));

  // Cada producto con control de stock genera una salida de inventario.
  const movimientos: Movimiento[] = v.items.flatMap((i) => {
    const p = productos.find((x) => x.id === i.productoId);
    if (!p || p.controlaStock !== "sí") return [];
    return [{
      id: nuevoId("M"), fecha, hora, productoId: p.id, producto: p.nombre, tipo: "salida", cantidad: -i.cantidad,
      costoUnitUsd: p.costoUsd, origen: "venta", referencia: id, nota: "", registradoPor: usuario, anulado: "",
    }];
  });

  await store.agregar("ventas", [venta]);
  await store.agregar("detalleVentas", detalle);
  await store.agregar("movimientos", movimientos);
  await avisarStockBajo(movimientos).catch((e) => console.error("Aviso de stock", e));
  return venta;
}

export const CobroInput = z.object({
  moneda: z.enum(["Bs", "USD"]),
  monto: z.number().positive().optional(),
  metodo: z.string().default(""),
  banco: z.string().default(""),
  referencia: z.string().default(""),
  tasa: z.number().positive().optional(),
  linkCapture: z.string().default(""),
});

/** Marca una venta "por cobrar" como pagada, con la tasa del día del pago. */
export async function registrarCobro(ventaId: string, entrada: z.input<typeof CobroInput>) {
  const c = CobroInput.parse(entrada);
  const store = getStore();
  const venta = (await store.listar("ventas")).find((v) => v.id === ventaId);
  if (!venta) throw new Error("Venta no encontrada");
  if (venta.anulado) throw new Error("La venta está anulada");
  if (venta.estado !== "pendiente") throw new Error("La venta ya estaba pagada");
  const tasa = c.tasa ?? (await tasaNegocio()).valor;
  const monto = c.monto ?? (c.moneda === "USD" ? venta.totalUsd : redondear(venta.totalUsd * tasa));
  await store.actualizar("ventas", (v) => v.id === ventaId, {
    estado: "pagada", moneda: c.moneda, monto, tasa, ...equivalentes(monto, c.moneda, tasa),
    metodo: c.metodo, banco: c.banco, referencia: c.referencia, fechaPago: hoy(),
    linkCapture: c.linkCapture || venta.linkCapture,
  });
}

/** Anula (no borra) la venta, su detalle y devuelve el inventario. */
export async function anularVenta(ventaId: string, usuario: string) {
  const store = getStore();
  const marca = `sí (${usuario}, ${hoy()})`;
  const n = await store.actualizar("ventas", (v) => v.id === ventaId && !v.anulado, { anulado: marca });
  if (!n) throw new Error("Venta no encontrada o ya anulada");
  await store.actualizar("detalleVentas", (d) => d.ventaId === ventaId, { anulado: marca });
  await store.actualizar("movimientos", (m) => m.referencia === ventaId, { anulado: marca });
}
