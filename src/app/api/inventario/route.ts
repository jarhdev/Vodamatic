import { z } from "zod";
import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { registrarMovimiento, stockActual } from "@/lib/services/inventario";

export const GET = manejar(async () => {
  await sesionApi();
  return { stock: await stockActual() };
});

export const POST = manejar(async (req: Request) => {
  const s = await sesionApi(true);
  const m = z
    .object({
      productoId: z.string().min(1),
      tipo: z.enum(["entrada", "salida", "conteo"]),
      cantidad: z.number().min(0),
      costoUnitUsd: z.number().min(0).optional(),
      nota: z.string().optional(),
    })
    .parse(await req.json());
  return { movimiento: await registrarMovimiento(m, s.nombre) };
});
