import { getStore, type Movimiento } from "../store";
import { botActivo, enviarMensaje, h } from "../telegram/api";
import { calcularStock } from "./inventario";

/** Manda un mensaje a todos los administradores que vincularon su Telegram. */
export async function avisarAdmins(texto: string) {
  if (!botActivo()) return 0;
  const admins = (await getStore().listar("usuarios")).filter((u) => u.rol === "admin" && u.estado !== "inactivo" && u.telegramId);
  await Promise.all(admins.map((u) => enviarMensaje(u.telegramId, texto).catch((e) => console.error("Telegram", e))));
  return admins.length;
}

/** Después de una venta: avisa si algún producto acaba de quedar en o por debajo de su mínimo. */
export async function avisarStockBajo(salidas: Movimiento[]) {
  if (!botActivo() || !salidas.length) return;
  const store = getStore();
  const [productos, movimientos] = await Promise.all([store.listar("productos"), store.listar("movimientos")]);
  const afectados = new Set(salidas.map((m) => m.productoId));
  const lineas = calcularStock(productos.filter((p) => afectados.has(p.id)), movimientos).filter((l) => {
    const vendido = -salidas.filter((m) => m.productoId === l.producto.id).reduce((s, m) => s + m.cantidad, 0);
    // Solo avisar cuando cruza el mínimo con esta venta, no en cada venta posterior.
    return l.stock <= l.producto.stockMinimo && l.stock + vendido > l.producto.stockMinimo;
  });
  if (!lineas.length) return;
  await avisarAdmins(
    `⚠️ <b>Stock bajo</b>\n` +
      lineas.map((l) => `• ${h(l.producto.nombre)}: <b>${l.stock}</b> ${h(l.producto.unidad)} (mínimo ${l.producto.stockMinimo})`).join("\n"),
  );
}
