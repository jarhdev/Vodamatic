import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { registrarCobro } from "@/lib/services/ventas";

export const POST = manejar(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await sesionApi();
  await registrarCobro((await ctx.params).id, await req.json());
});
