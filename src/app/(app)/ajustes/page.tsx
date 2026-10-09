import { redirect } from "next/navigation";
import { config, modoDemo } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { lectorDisponible } from "@/lib/ai/lector";
import { botActivo } from "@/lib/telegram/api";
import { Etiqueta, Tarjeta, Titulo } from "@/components/ui";
import { PanelTelegram } from "./PanelTelegram";

export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const sesion = await requerirSesion();
  if (sesion.rol !== "admin") redirect("/");
  const estado = (ok: boolean, si: string, no: string) => <Etiqueta tono={ok ? "ok" : "aviso"}>{ok ? si : no}</Etiqueta>;
  return (
    <div className="space-y-4">
      <Titulo sub="Conexiones del negocio">Ajustes</Titulo>
      <Tarjeta titulo="Estado" icono="ajustes">
        <ul className="divide-y divide-borde text-sm">
          <li className="flex items-center justify-between py-2"><span>Negocio</span><span className="text-tinta-2">{config.negocio} · {config.plantilla.nombre}</span></li>
          <li className="flex items-center justify-between py-2"><span>Tasa de conversión</span><span className="text-tinta-2">BCV {config.tasaReferencia === "eur" ? "euro" : "dólar"}</span></li>
          <li className="flex items-center justify-between py-2"><span>Google Sheets</span>{estado(!modoDemo(), "Conectado", "Modo demo")}</li>
          <li className="flex items-center justify-between py-2"><span>Lectura de facturas con IA</span>{estado(lectorDisponible(), "Activa", "Falta ANTHROPIC_API_KEY")}</li>
          <li className="flex items-center justify-between py-2"><span>Bot de Telegram</span>{estado(botActivo(), "Token cargado", "Falta TELEGRAM_BOT_TOKEN")}</li>
        </ul>
      </Tarjeta>
      <Tarjeta titulo="Bot de Telegram" icono="telegram" destacada>
        <PanelTelegram />
      </Tarjeta>
    </div>
  );
}
