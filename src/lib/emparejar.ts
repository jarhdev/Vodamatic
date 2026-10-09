import type { Producto } from "./store/esquema";

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca el producto del inventario que más palabras comparte con el renglón de una factura. */
export function sugerirProducto(descripcion: string, productos: Producto[]): string {
  const palabras = normal(descripcion).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let mejor = { id: "", puntos: 0 };
  for (const p of productos) {
    const nombre = normal(p.nombre);
    const puntos = palabras.filter((w) => nombre.includes(w)).length;
    if (puntos > mejor.puntos) mejor = { id: p.id, puntos };
  }
  return mejor.puntos > 0 ? mejor.id : "";
}
