import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { botActivo, secretoWebhook, tg } from "@/lib/telegram/api";

const COMANDOS = [
  { command: "resumen", description: "Ventas, gastos y ganancia" },
  { command: "stock", description: "Productos por reponer" },
  { command: "cobrar", description: "Cuentas por cobrar" },
  { command: "tasa", description: "Tasa BCV del día" },
  { command: "vincular", description: "Vincular tu usuario: /vincular Nombre PIN" },
];

/** Estado del bot para la pantalla de Ajustes. */
export const GET = manejar(async () => {
  await sesionApi(true);
  if (!botActivo()) return { activo: false };
  const [yo, webhook] = await Promise.all([
    tg<{ username: string }>("getMe"),
    tg<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo"),
  ]);
  return { activo: true, usuario: yo.username, webhook };
});

/** Conecta el bot a esta app (setWebhook) y registra el menú de comandos. */
export const POST = manejar(async (req: Request) => {
  await sesionApi(true);
  if (!botActivo()) throw new Error("Falta TELEGRAM_BOT_TOKEN en las variables de entorno");
  if (!secretoWebhook()) throw new Error("Falta TELEGRAM_WEBHOOK_SECRET en las variables de entorno");
  const url = `${new URL(req.url).origin}/api/telegram`;
  await tg("setWebhook", { url, secret_token: secretoWebhook(), allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  await tg("setMyCommands", { commands: COMANDOS });
  return { url };
});
