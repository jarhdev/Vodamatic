import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { botActivo, secretoWebhook } from "@/lib/telegram/api";
import { manejarUpdate, type TgUpdate } from "@/lib/telegram/bot";

export const maxDuration = 60;

/** Webhook del bot. Telegram llama aquí con cada mensaje o botón tocado. */
export async function POST(req: Request) {
  const esperado = secretoWebhook();
  const recibido = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!botActivo() || !esperado || recibido.length !== esperado.length || !timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await manejarUpdate((await req.json()) as TgUpdate);
  } catch (e) {
    // Siempre 200: si respondemos error, Telegram reintenta el mismo mensaje una y otra vez.
    console.error("Telegram update", e);
  }
  return NextResponse.json({ ok: true });
}
