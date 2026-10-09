import Link from "next/link";
import { config, modoDemo } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { tasaNegocio } from "@/lib/services/tasas";
import { formatoTasa } from "@/lib/dinero";
import { Nav, Salir } from "./Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const t = await tasaNegocio().catch(() => null);
  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-24 sm:pb-8">
      <header className="sticky top-0 z-10 border-b border-borde bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{config.negocio}</div>
            <div className="text-xs text-tinta-3">{sesion.nombre} · {sesion.rol}</div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tasa" className="rounded-full bg-acento-suave px-3 py-1 text-xs font-medium text-acento num">
              {t ? `${config.tasaReferencia === "eur" ? "€" : "$"} ${formatoTasa(t.valor)} Bs` : "Cargar tasa"}
            </Link>
            <Salir />
          </div>
        </div>
        <Nav />
      </header>
      {modoDemo() && <div className="bg-aviso-suave px-4 py-1.5 text-center text-xs text-aviso">Modo demo · datos de ejemplo</div>}
      <main className="px-4 py-5">{children}</main>
    </div>
  );
}
