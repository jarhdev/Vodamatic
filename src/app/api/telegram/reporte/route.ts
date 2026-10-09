import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { avisarAdmins } from "@/lib/services/alertas";
import { textoReporteDiario } from "@/lib/telegram/bot";

/** Envía el cierre del día a los administradores vinculados. Lo llama la función programada (o n8n con X-Api-Key). */
export const POST = manejar(async () => {
  await sesionApi(true);
  return { enviados: await avisarAdmins(await textoReporteDiario()) };
});
