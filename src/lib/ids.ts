import { sello } from "./fechas";

/** IDs legibles al estilo Bombi: V-261009-140512-k3 (venta), G- (gasto), M- (movimiento). */
export function nuevoId(prefijo: "V" | "G" | "M" | "P" | "U", d = new Date()): string {
  const azar = Math.random().toString(36).slice(2, 4);
  return `${prefijo}-${sello(d)}-${azar}`;
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
