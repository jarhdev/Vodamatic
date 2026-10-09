// Cliente mínimo de la Bot API de Telegram (gratis, sin límites de costo).

export function botActivo(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function url(metodo: string) {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${metodo}`;
}

export async function tg<T = unknown>(metodo: string, cuerpo: Record<string, unknown> = {}): Promise<T> {
  if (!botActivo()) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  const res = await fetch(url(metodo), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${metodo}: ${json.description}`);
  return json.result;
}

export type Boton = { text: string; callback_data: string };

export function enviarMensaje(chatId: string | number, texto: string, botones?: Boton[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(botones ? { reply_markup: { inline_keyboard: botones } } : {}),
  });
}

export function editarMensaje(chatId: string | number, mensajeId: number, texto: string, botones?: Boton[][]) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: mensajeId,
    text: texto,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: botones ?? [] },
  });
}

/** Descarga una foto o documento enviado al bot. */
export async function descargarArchivo(fileId: string): Promise<Buffer> {
  const f = await tg<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${f.file_path}`);
  if (!res.ok) throw new Error("No se pudo descargar el archivo de Telegram");
  return Buffer.from(await res.arrayBuffer());
}

/** Escapa texto para parse_mode HTML. */
export const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Clave secreta que Telegram envía en cada webhook, para rechazar llamadas falsas. */
export function secretoWebhook(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET || "";
}
