import { z } from "zod";
import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { guardarTasaManual, tasaDelDia } from "@/lib/services/tasas";
import { config } from "@/lib/config";

export const GET = manejar(async () => {
  await sesionApi();
  return { tasa: await tasaDelDia(), referencia: config.tasaReferencia };
});

/** Carga manual de la tasa del día (si el BCV no publicó o el negocio usa otra). */
export const POST = manejar(async (req: Request) => {
  await sesionApi(true);
  const { usd, eur } = z.object({ usd: z.number().positive(), eur: z.number().min(0).default(0) }).parse(await req.json());
  return { tasa: await guardarTasaManual(usd, eur) };
});
