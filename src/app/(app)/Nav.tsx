"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { enviar } from "@/components/cliente";

const ENLACES = [
  { href: "/", texto: "Inicio", icono: "◧" },
  { href: "/ventas", texto: "Ventas", icono: "＄" },
  { href: "/gastos", texto: "Gastos", icono: "⇣" },
  { href: "/inventario", texto: "Inventario", icono: "▤" },
  { href: "/cobrar", texto: "Por cobrar", icono: "⏱" },
  { href: "/productos", texto: "Productos", icono: "☰" },
];

export function Nav() {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));
  return (
    <>
      {/* Escritorio: pestañas bajo el encabezado */}
      <nav className="mt-3 hidden gap-1 sm:flex">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href}
            className={`rounded-lg px-3 py-1.5 text-sm ${activo(e.href) ? "bg-surface font-medium text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"}`}>
            {e.texto}
          </Link>
        ))}
      </nav>
      {/* Teléfono: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-borde bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${activo(e.href) ? "font-semibold text-acento" : "text-tinta-3"}`}>
            <span aria-hidden className="text-base leading-none">{e.icono}</span>
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
    <button type="button" className="text-xs text-tinta-3 hover:text-tinta" onClick={async () => { await enviar("/api/auth/logout"); router.replace("/login"); router.refresh(); }}>
      Salir
    </button>
  );
}
