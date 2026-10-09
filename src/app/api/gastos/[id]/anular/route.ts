import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { anularGasto } from "@/lib/services/gastos";

export const POST = manejar(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const s = await sesionApi(true);
  await anularGasto((await ctx.params).id, s.nombre);
});
