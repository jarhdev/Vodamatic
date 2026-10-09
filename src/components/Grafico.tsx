"use client";

import { useState } from "react";
import { formatoUsd } from "@/lib/dinero";

interface Punto {
  fecha: string;
  ventasUsd: number;
  gastosUsd: number;
}

const SERIES = [
  { clave: "ventasUsd", nombre: "Ventas", color: "var(--series-1)" },
  { clave: "gastosUsd", nombre: "Gastos", color: "var(--series-2)" },
] as const;

/** Barras agrupadas ventas vs gastos por día, con tooltip al pasar el dedo/mouse. */
export function GraficoDias({ datos }: { datos: Punto[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const W = 640, H = 200, M = { t: 12, r: 8, b: 24, l: 44 };
  const max = Math.max(1, ...datos.flatMap((d) => [d.ventasUsd, d.gastosUsd]));
  const paso = niceStep(max);
  const tope = Math.ceil(max / paso) * paso;
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / tope);
  const banda = (W - M.l - M.r) / datos.length;
  const barra = Math.min(14, (banda - 6) / 2);
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  const d = activo != null ? datos[activo] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-tinta-2">
        {SERIES.map((s) => (
          <span key={s.clave} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.nombre}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ventas y gastos por día, últimos 14 días" onMouseLeave={() => setActivo(null)}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m)} y2={y(m)} stroke="var(--grid)" strokeWidth={1} />
            <text x={M.l - 6} y={y(m)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--text-3)" className="num">
              ${m}
            </text>
          </g>
        ))}
        {datos.map((p, i) => {
          const x0 = M.l + i * banda + banda / 2 - barra - 1;
          return (
            <g key={p.fecha} onMouseEnter={() => setActivo(i)} onTouchStart={() => setActivo(i)}>
              <rect x={M.l + i * banda} y={M.t} width={banda} height={H - M.t - M.b} fill={activo === i ? "var(--surface-2)" : "transparent"} />
              {SERIES.map((s, k) => {
                const v = p[s.clave];
                const top = y(v);
                const h = Math.max(0, y(0) - top);
                return h > 0 ? <path key={s.clave} d={barraRedondeada(x0 + k * (barra + 2), top, barra, h, Math.min(4, h))} fill={s.color} /> : null;
              })}
              {(i % 2 === datos.length % 2 || datos.length <= 7) && (
                <text x={M.l + i * banda + banda / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-3)">
                  {p.fecha.slice(8)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {d && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-lg border border-borde bg-surface px-3 py-2 text-xs shadow-sm">
          <div className="mb-1 font-medium text-tinta">{d.fecha.split("-").reverse().join("/")}</div>
          {SERIES.map((s) => (
            <div key={s.clave} className="flex items-center gap-2 text-tinta-2">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.nombre}: <span className="num font-medium text-tinta">{formatoUsd(d[s.clave])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function niceStep(max: number) {
  const bruto = max / 4;
  const p = 10 ** Math.floor(Math.log10(bruto));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= bruto) ?? p * 10;
}

/** Barra con esquinas superiores redondeadas y base recta sobre el eje. */
function barraRedondeada(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
