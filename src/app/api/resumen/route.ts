import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { getStore } from "@/lib/store";
import { calcularResumen } from "@/lib/services/resumen";
import { stockActual } from "@/lib/services/inventario";
import { tasaDelDia } from "@/lib/services/tasas";

/** Pensado también para n8n: reporte diario por WhatsApp/Telegram/email. */
export const GET = manejar(async () => {
  await sesionApi();
  const store = getStore();
  const [ventas, gastos, detalle, stock, tasa] = await Promise.all([
    store.listar("ventas"), store.listar("gastos"), store.listar("detalleVentas"), stockActual(), tasaDelDia(),
  ]);
  return {
    tasa,
    ...calcularResumen(ventas, gastos, detalle),
    stockBajo: stock.filter((l) => l.estado !== "OK").map((l) => ({ producto: l.producto.nombre, stock: l.stock, minimo: l.producto.stockMinimo })),
  };
});
