"use client";

import { useEffect, useState } from "react";
import { claseBoton } from "@/components/ui";
import { enviar } from "@/components/cliente";

interface Estado {
  activo: boolean;
  usuario?: string;
  webhook?: { url: string; pending_update_count: number; last_error_message?: string };
  error?: string;
}

export function PanelTelegram() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    const res = await fetch("/api/telegram/configurar");
    const json = await res.json();
    setEstado(res.ok ? json : { activo: false, error: json.error });
  }
  useEffect(() => { cargar(); }, []);

  const conectado = Boolean(estado?.webhook?.url?.endsWith("/api/telegram"));

  return (
    <div className="space-y-4 text-sm">
      {!estado ? <p className="text-tinta-3">Consultando…</p> : !estado.activo ? (
        <div className="space-y-2 text-tinta-2">
          {estado.error && <p className="text-peligro">{estado.error}</p>}
          <p>Para activar el bot:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>En Telegram, abre <b>@BotFather</b>, envía <code>/newbot</code> y copia el token.</li>
            <li>En Netlify agrega <code>TELEGRAM_BOT_TOKEN</code> (el token) y <code>TELEGRAM_WEBHOOK_SECRET</code> (una clave al azar, solo letras y números).</li>
            <li>Vuelve a publicar el sitio y regresa a esta pantalla.</li>
          </ol>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">@{estado.usuario}</div>
              <div className={conectado ? "text-ok" : "text-aviso"}>{conectado ? "Conectado a esta app" : "Sin conectar"}</div>
              {estado.webhook?.last_error_message && <div className="text-xs text-peligro">Último error: {estado.webhook.last_error_message}</div>}
            </div>
            <button type="button" className={claseBoton} disabled={ocupado} onClick={async () => {
              setOcupado(true); setMsg("");
              try { await enviar("/api/telegram/configurar"); setMsg("Bot conectado ✓"); await cargar(); }
              catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
              finally { setOcupado(false); }
            }}>{conectado ? "Reconectar" : "Conectar bot"}</button>
          </div>
          {msg && <p className="text-turquesa">{msg}</p>}
          <div className="rounded-xl bg-surface-2 p-3 text-tinta-2">
            <p className="mb-1 font-medium text-tinta">Cada persona del equipo:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Abre <a className="text-turquesa" href={`https://t.me/${estado.usuario}`} target="_blank">t.me/{estado.usuario}</a></li>
              <li>Envía <code>/vincular SuNombre SuPIN</code> (el mismo de la app).</li>
              <li>Listo: puede mandar fotos de capturas y facturas, y usar /resumen, /stock, /cobrar y /tasa.</li>
            </ol>
            <p className="mt-2 text-xs">Los administradores reciben el cierre del día a las 9:00 pm y avisos cuando un producto queda bajo el mínimo.</p>
          </div>
        </>
      )}
    </div>
  );
}
