import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { getStore } from "@/lib/store";
import { guardarProducto } from "@/lib/services/productos";

export const GET = manejar(async () => {
  await sesionApi();
  return { productos: await getStore().listar("productos") };
});

export const POST = manejar(async (req: Request) => {
  await sesionApi(true);
  return { producto: await guardarProducto(await req.json()) };
});
