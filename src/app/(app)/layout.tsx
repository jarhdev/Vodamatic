import Link from "next/link";
import { config, modoDemo } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { tasaNegocio } from "@/lib/services/tasas";
import { formatoTasa } from "@/lib/dinero";
import { Icono, Marca } from "@/components/Icono";
import { Nav, NavMovil, Salir } from "./Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const t = await tasaNegocio().catch(() => null);
  return (
    <div className="mx-auto min-h-dvh max-w-4xl pb-24 sm:pb-10">
      <header className="sticky top-0 z-10 border-b border-borde bg-bg/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Marca />
            <div className="min-w-0">
              <div className="truncate font-semibold leading-tight">{config.negocio}</div>
              <div className="truncate text-xs text-tinta-3">{sesion.nombre} · {sesion.rol}<span className="hidden sm:inline"> · <span className="texto-degradado font-medium">Vodamatic</span></span></div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/tasa" className="num mr-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-turquesa/30 bg-turquesa-suave px-3 py-1 text-xs font-medium text-turquesa">
              <Icono nombre="tasa" className="h-3.5 w-3.5" />
              {t ? `${config.tasaReferencia === "eur" ? "€" : "$"} ${formatoTasa(t.valor)}` : "Cargar tasa"}
            </Link>
            {sesion.rol === "admin" && (
              <Link href="/ajustes" aria-label="Ajustes" title="Ajustes" className="rounded-lg p-2 text-tinta-3 transition hover:bg-surface-2 hover:text-tinta">
                <Icono nombre="ajustes" className="h-4 w-4" />
              </Link>
            )}
            <Salir />
          </div>
        </div>
        <Nav />
      </header>
      {modoDemo() && <div className="border-b border-aviso/20 bg-aviso-suave px-4 py-1.5 text-center text-xs text-aviso">Modo demo · datos de ejemplo</div>}
      <main className="px-4 py-6">{children}</main>
      <NavMovil />
    </div>
  );
}
