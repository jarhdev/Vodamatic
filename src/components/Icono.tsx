// Íconos de línea (estilo Lucide) dibujados en SVG, sin dependencias.
const RUTAS: Record<string, string> = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  ventas: "M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6 M9 21h.01 M18 21h.01",
  gastos: "M4 3h16v18l-3-2-2.5 2L12 19l-2.5 2L7 19l-3 2z M8 8h8 M8 12h8 M8 16h5",
  inventario: "M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
  cobrar: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  productos: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01",
  ajustes: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  camara: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  subida: "M3 17l6-6 4 4 8-8 M14 7h7v7",
  bajada: "M3 7l6 6 4-4 8 8 M14 17h7v-7",
  dinero: "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  alerta: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  check: "M20 6 9 17l-5-5",
  telegram: "M21.5 4.5 2.8 11.7c-1 .4-1 1.8.1 2.1l4.6 1.4 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.8.6 1.9.1 2.1-.9l3-15.2c.2-1.1-.9-1.9-1.9-1.5z M7.5 15.2 18 7.5",
  tasa: "M7 16V4 M3 8l4-4 4 4 M17 8v12 M21 16l-4 4-4-4",
  mas: "M12 5v14 M5 12h14",
};

export type NombreIcono = keyof typeof RUTAS;

export function Icono({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={RUTAS[nombre] ?? ""} />
    </svg>
  );
}

/** Marca de Vodamatic: cuadrado con degradado azul→turquesa. */
export function Marca({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`degradado inline-flex items-center justify-center rounded-xl shadow-[0_0_24px_rgba(45,212,191,0.35)] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="#03141a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 6l7 13 7-13" />
      </svg>
    </span>
  );
}
