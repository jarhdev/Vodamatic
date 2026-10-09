import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { getStore } from "@/lib/store";
import { registrarGasto } from "@/lib/services/gastos";

export const GET = manejar(async (req: Request) => {
  await sesionApi();
  const desde = new URL(req.url).searchParams.get("desde") ?? "";
  return { gastos: (await getStore().listar("gastos")).filter((g) => g.fecha >= desde).reverse() };
});

export const POST = manejar(async (req: Request) => {
  const s = await sesionApi();
  return { gasto: await registrarGasto(await req.json(), s.nombre) };
});
