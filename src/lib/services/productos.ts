import { z } from "zod";
import { slug } from "../ids";
import { getStore, type Producto } from "../store";
import { config } from "../config";

export const ProductoInput = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1),
  categoria: z.string().default(""),
  unidad: z.string().default("und"),
  precioUsd: z.number().min(0),
  costoUsd: z.number().min(0).default(0),
  stockMinimo: z.number().min(0).default(0),
  controlaStock: z.boolean().optional(),
  activo: z.boolean().default(true),
});

export async function guardarProducto(entrada: z.input<typeof ProductoInput>): Promise<Producto> {
  const p = ProductoInput.parse(entrada);
  const store = getStore();
  const existentes = await store.listar("productos");
  const fila: Producto = {
    id: p.id || slug(p.nombre),
    nombre: p.nombre, categoria: p.categoria, unidad: p.unidad, precioUsd: p.precioUsd, costoUsd: p.costoUsd,
    stockMinimo: p.stockMinimo, controlaStock: (p.controlaStock ?? config.plantilla.controlaStockPorDefecto) ? "sí" : "no",
    activo: p.activo ? "sí" : "no",
  };
  if (p.id && existentes.some((x) => x.id === p.id)) {
    await store.actualizar("productos", (x) => x.id === p.id, fila);
  } else {
    let id = fila.id || "producto";
    for (let n = 2; existentes.some((x) => x.id === id); n++) id = `${fila.id}-${n}`;
    fila.id = id;
    await store.agregar("productos", [fila]);
  }
  return fila;
}
