import type { ReactNode } from "react";

export function Tarjeta({ titulo, accion, children, className = "" }: { titulo?: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-borde bg-surface p-4 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-sm font-semibold text-tinta">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-0.5 text-sm text-tinta-2">{sub}</p>}
    </div>
  );
}

export function Etiqueta({ tono = "neutro", children }: { tono?: "neutro" | "ok" | "aviso" | "peligro" | "acento"; children: ReactNode }) {
  const tonos = {
    neutro: "bg-surface-2 text-tinta-2",
    ok: "bg-ok-suave text-ok",
    aviso: "bg-aviso-suave text-aviso",
    peligro: "bg-peligro-suave text-peligro",
    acento: "bg-acento-suave text-acento",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tonos[tono]}`}>{children}</span>;
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-tinta-3">{children}</p>;
}

export const claseInput =
  "w-full rounded-xl border border-borde bg-surface px-3 py-2.5 text-tinta outline-none placeholder:text-tinta-3 focus:border-acento focus:ring-2 focus:ring-acento/20";

export const claseBoton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-acento px-4 py-2.5 font-medium text-acento-tinta transition hover:opacity-90 disabled:opacity-50";

export const claseBotonSec =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-borde bg-surface px-4 py-2.5 font-medium text-tinta transition hover:bg-surface-2 disabled:opacity-50";

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-tinta-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span>}
    </label>
  );
}
