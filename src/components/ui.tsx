import type { ReactNode } from "react";
import { Icono } from "./Icono";

export function Tarjeta({ titulo, icono, accion, children, className = "", destacada = false }: {
  titulo?: ReactNode; icono?: string; accion?: ReactNode; children: ReactNode; className?: string; destacada?: boolean;
}) {
  return (
    <section className={`rounded-2xl p-4 ${destacada ? "borde-degradado" : "border border-borde bg-surface"} ${className}`}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titulo && (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
              {icono && <span className="text-turquesa"><Icono nombre={icono} className="h-4 w-4" /></span>}
              {titulo}
            </h2>
          )}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-tinta-2">{sub}</p>}
    </div>
  );
}

export function Etiqueta({ tono = "neutro", children }: { tono?: "neutro" | "ok" | "aviso" | "peligro" | "acento" | "azul"; children: ReactNode }) {
  const tonos = {
    neutro: "bg-surface-3 text-tinta-2",
    ok: "bg-ok-suave text-ok",
    aviso: "bg-aviso-suave text-aviso",
    peligro: "bg-peligro-suave text-peligro",
    acento: "bg-turquesa-suave text-turquesa",
    azul: "bg-azul-suave text-azul",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tonos[tono]}`}>{children}</span>;
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-tinta-3">{children}</p>;
}

export const claseInput =
  "w-full rounded-xl border border-borde bg-surface-2 px-3 py-2.5 text-tinta outline-none transition placeholder:text-tinta-3 focus:border-turquesa focus:ring-2 focus:ring-turquesa/25";

export const claseBoton =
  "degradado inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-acento-tinta shadow-[0_8px_24px_-8px_rgba(45,212,191,0.55)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none";

export const claseBotonSec =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-borde-fuerte bg-surface-2 px-4 py-2.5 font-medium text-tinta transition hover:border-turquesa/60 hover:bg-surface-3 disabled:opacity-50";

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-tinta-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span>}
    </label>
  );
}
