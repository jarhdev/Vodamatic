import { PESTAÑAS_CALCULADAS, getStore, type Celda } from "../store";
import { marcaTiempo } from "../fechas";
import { calcularStock } from "./inventario";
import { calcularResumen } from "./resumen";

/**
 * Reescribe las pestañas "Stock" y "Resumen" del Sheet para que el dueño
 * siempre vea los números al día sin fórmulas que se rompan.
 */
export async function recalcularPestañas() {
  const store = getStore();
  const [productos, movimientos, ventas, gastos, detalle] = await Promise.all([
    store.listar("productos"), store.listar("movimientos"), store.listar("ventas"), store.listar("gastos"), store.listar("detalleVentas"),
  ]);

  const stock: Celda[][] = [
    ["Producto id", "Producto", "Stock", "Stock mínimo", "Estado", "Costo USD", "Valor USD"],
    ...calcularStock(productos, movimientos).map((l) => [l.producto.id, l.producto.nombre, l.stock, l.producto.stockMinimo, l.estado, l.producto.costoUsd, l.valorUsd]),
  ];

  const r = calcularResumen(ventas, gastos, detalle);
  const resumen: Celda[][] = [
    ["Resumen (todo en USD). Esta hoja la actualiza la app; no hace falta editarla.", "", "", "", "", ""],
    ["Actualizado", marcaTiempo(), "", "", "", ""],
    ["Periodo", "Ventas USD", "Cobrado USD", "Gastos USD", "Ganancia USD", "Nº ventas"],
    ...r.periodos.map((p) => [p.nombre, p.ventasUsd, p.cobradoUsd, p.gastosUsd, p.gananciaUsd, p.nVentas]),
    ["", "", "", "", "", ""],
    ["Por cobrar USD", r.porCobrarUsd, "Ventas pendientes", r.nPendientes, "", ""],
    ["", "", "", "", "", ""],
    ["Más vendidos esta semana", "Cantidad", "USD", "", "", ""],
    ...r.topSemana.map((t) => [t.producto, t.cantidad, t.usd, "", "", ""]),
  ];

  await Promise.all([store.escribirPestaña(PESTAÑAS_CALCULADAS.stock, stock), store.escribirPestaña(PESTAÑAS_CALCULADAS.resumen, resumen)]);
}
