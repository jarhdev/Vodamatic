// Función programada de Netlify: todos los días a las 9:00 pm de Venezuela (01:00 UTC)
// manda el cierre del día por Telegram a los administradores.
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL;
  const key = process.env.API_KEY;
  if (!base || !key || !process.env.TELEGRAM_BOT_TOKEN) return new Response("sin configurar", { status: 200 });
  const res = await fetch(`${base}/api/telegram/reporte`, { method: "POST", headers: { "x-api-key": key } });
  return new Response(await res.text(), { status: res.status });
};

export const config: Config = { schedule: "0 1 * * *" };
