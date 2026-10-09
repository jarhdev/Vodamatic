import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { anularVenta } from "@/lib/services/ventas";

export const POST = manejar(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const s = await sesionApi(true);
  await anularVenta((await ctx.params).id, s.nombre);
});
