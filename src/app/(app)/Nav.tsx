"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { enviar } from "@/components/cliente";
import { Icono } from "@/components/Icono";

const ENLACES = [
  { href: "/", texto: "Inicio", icono: "inicio" },
  { href: "/ventas", texto: "Ventas", icono: "ventas" },
  { href: "/gastos", texto: "Gastos", icono: "gastos" },
  { href: "/inventario", texto: "Inventario", icono: "inventario" },
  { href: "/cobrar", texto: "Por cobrar", icono: "cobrar" },
  { href: "/productos", texto: "Productos", icono: "productos" },
];

function useActivo() {
  const ruta = usePathname();
  return (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));
}

/** Escritorio: pestañas bajo el encabezado. */
export function Nav() {
  const activo = useActivo();
  return (
    <>
      <nav className="mt-3 hidden gap-1 sm:flex">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${activo(e.href)
              ? "bg-surface-3 font-medium text-tinta shadow-[inset_0_-2px_0_var(--turq)]"
              : "text-tinta-2 hover:bg-surface-2 hover:text-tinta"}`}>
            <Icono nombre={e.icono} className={`h-4 w-4 ${activo(e.href) ? "text-turquesa" : ""}`} />
            {e.texto}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Teléfono: barra inferior. Va fuera del encabezado: su backdrop-blur rompería el position: fixed. */
export function NavMovil() {
  const activo = useActivo();
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-borde bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] ${activo(e.href) ? "font-semibold text-turquesa" : "text-tinta-3"}`}>
            {activo(e.href) && <span className="degradado absolute inset-x-4 top-0 h-0.5 rounded-full" />}
            <Icono nombre={e.icono} className="h-5 w-5" />
            {e.texto}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function Salir() {
  const router = useRouter();
  return (
    <button type="button" aria-label="Salir" title="Salir" className="rounded-lg p-2 text-tinta-3 transition hover:bg-surface-2 hover:text-tinta"
      onClick={async () => { await enviar("/api/auth/logout"); router.replace("/login"); router.refresh(); }}>
      <Icono nombre="salir" className="h-4 w-4" />
    </button>
  );
}
