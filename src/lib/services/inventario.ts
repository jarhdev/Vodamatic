import { hoy, horaActual } from "../fechas";
import { nuevoId } from "../ids";
import { redondear } from "../dinero";
import { getStore, type Movimiento, type Producto } from "../store";

export interface LineaStock {
  producto: Producto;
  stock: number;
  estado: "OK" | "Bajo" | "Agotado";
  valorUsd: number;
}

export function calcularStock(productos: Producto[], movimientos: Movimiento[]): LineaStock[] {
  const total = new Map<string, number>();
  for (const m of movimientos) {
    if (m.anulado) continue;
    total.set(m.productoId, (total.get(m.productoId) ?? 0) + m.cantidad);
  }
  return productos
    .filter((p) => p.controlaStock === "sí" && p.activo !== "no")
    .map((p) => {
      const stock = redondear(total.get(p.id) ?? 0, 3);
      const estado = stock <= 0 ? "Agotado" : stock <= p.stockMinimo ? "Bajo" : "OK";
      return { producto: p, stock, estado, valorUsd: redondear(Math.max(stock, 0) * p.costoUsd) } as LineaStock;
    })
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
}

export async function stockActual() {
  const store = getStore();
  const [productos, movimientos] = await Promise.all([store.listar("productos"), store.listar("movimientos")]);
  return calcularStock(productos, movimientos);
}

export interface MovimientoManual {
  productoId: string;
  /** entrada / salida suman o restan; conteo fija el stock al número contado (inventario físico). */
  tipo: "entrada" | "salida" | "conteo";
  cantidad: number;
  costoUnitUsd?: number;
  nota?: string;
}

export async function registrarMovimiento(m: MovimientoManual, usuario: string) {
  const store = getStore();
  const productos = await store.listar("productos");
  const p = productos.find((x) => x.id === m.productoId);
  if (!p) throw new Error("Producto no encontrado");
  if (!(m.cantidad >= 0)) throw new Error("Cantidad inválida");

  let delta = m.cantidad;
  if (m.tipo === "salida") delta = -m.cantidad;
  if (m.tipo === "conteo") {
    const actual = calcularStock([p], await store.listar("movimientos"))[0]?.stock ?? 0;
    delta = redondear(m.cantidad - actual, 3);
    if (delta === 0) return null;
  }
  const mov: Movimiento = {
    id: nuevoId("M"), fecha: hoy(), hora: horaActual(), productoId: p.id, producto: p.nombre,
    tipo: m.tipo === "conteo" ? "ajuste" : m.tipo, cantidad: delta, costoUnitUsd: m.costoUnitUsd ?? p.costoUsd,
    origen: "manual", referencia: "", nota: m.nota ?? (m.tipo === "conteo" ? `Conteo físico: ${m.cantidad}` : ""),
    registradoPor: usuario, anulado: "",
  };
  await store.agregar("movimientos", [mov]);
  if (m.tipo === "entrada" && m.costoUnitUsd && m.costoUnitUsd > 0) {
    await store.actualizar("productos", (x) => x.id === p.id, { costoUsd: redondear(m.costoUnitUsd, 4) });
  }
  return mov;
}
