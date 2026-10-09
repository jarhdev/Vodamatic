import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { getStore } from "@/lib/store";
import { registrarVenta } from "@/lib/services/ventas";

export const GET = manejar(async (req: Request) => {
  await sesionApi();
  const url = new URL(req.url);
  const desde = url.searchParams.get("desde") ?? "";
  const estado = url.searchParams.get("estado");
  const ventas = (await getStore().listar("ventas"))
    .filter((v) => v.fecha >= desde && (!estado || v.estado === estado))
    .reverse();
  return { ventas };
});

export const POST = manejar(async (req: Request) => {
  const s = await sesionApi();
  return { venta: await registrarVenta(await req.json(), s.nombre) };
});
