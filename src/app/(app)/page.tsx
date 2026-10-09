import Link from "next/link";
import { getStore } from "@/lib/store";
import { calcularResumen } from "@/lib/services/resumen";
import { stockActual } from "@/lib/services/inventario";
import { tasaNegocio } from "@/lib/services/tasas";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import { Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { GraficoDias } from "@/components/Grafico";
import { Icono } from "@/components/Icono";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const store = getStore();
  const [ventas, gastos, detalle, stock, t] = await Promise.all([
    store.listar("ventas"), store.listar("gastos"), store.listar("detalleVentas"), stockActual(), tasaNegocio().catch(() => null),
  ]);
  const r = calcularResumen(ventas, gastos, detalle);
  const [dia, , semana, semanaPasada, mes] = r.periodos;
  const tasa = t?.valor ?? 0;
  const bajos = stock.filter((l) => l.estado !== "OK");
  const cambioSemana = semanaPasada.ventasUsd ? Math.round(((semana.ventasUsd - semanaPasada.ventasUsd) / semanaPasada.ventasUsd) * 100) : null;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi titulo="Ventas hoy" icono="ventas" tono="turquesa" usd={dia.ventasUsd} tasa={tasa} pie={`${dia.nVentas} ventas`} />
        <Kpi titulo="Gastos hoy" icono="gastos" tono="azul" usd={dia.gastosUsd} tasa={tasa} />
        <Kpi titulo="Ventas semana" icono={cambioSemana != null && cambioSemana < 0 ? "bajada" : "subida"} tono="turquesa" usd={semana.ventasUsd} tasa={tasa}
          pie={cambioSemana == null ? `${semana.nVentas} ventas` : `${cambioSemana >= 0 ? "▲" : "▼"} ${Math.abs(cambioSemana)}% vs. semana pasada`} />
        <Kpi titulo="Ganancia del mes" icono="dinero" tono="degradado" usd={mes.gananciaUsd} tasa={tasa} pie="ventas − gastos" />
      </section>

      <Tarjeta titulo="Últimos 14 días" icono="subida">
        <GraficoDias datos={r.porDia} />
      </Tarjeta>

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Por cobrar" icono="cobrar" accion={<Link href="/cobrar" className="text-xs font-medium text-acento">Ver</Link>}>
          <div className="num text-3xl font-semibold text-tinta">{formatoUsd(r.porCobrarUsd)}</div>
          <p className="text-sm text-tinta-2">{r.nPendientes} ventas pendientes</p>
        </Tarjeta>
        <Tarjeta titulo="Inventario" icono="inventario" accion={<Link href="/inventario" className="text-xs font-medium text-acento">Ver</Link>}>
          {bajos.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ok"><Icono nombre="check" className="h-4 w-4" /> Todo el stock está sobre el mínimo</p>
          ) : (
            <ul className="space-y-1.5">
              {bajos.slice(0, 5).map((l) => (
                <li key={l.producto.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{l.producto.nombre}</span>
                  <Etiqueta tono={l.estado === "Agotado" ? "peligro" : "aviso"}>{l.estado === "Agotado" ? "⛔" : "⚠"} {l.stock} / mín. {l.producto.stockMinimo}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Más vendidos esta semana" icono="productos">
          {r.topSemana.length === 0 ? <Vacio>Sin ventas esta semana</Vacio> : (
            <ol className="space-y-1.5">
              {r.topSemana.map((p, i) => (
                <li key={p.producto} className="flex justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${i === 0 ? "degradado text-acento-tinta" : "bg-surface-3 text-tinta-2"}`}>{i + 1}</span><span className="truncate">{p.producto}</span></span>
                  <span className="num text-tinta-2">{p.cantidad} · {formatoUsd(p.usd)}</span>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>
        <Tarjeta titulo="Gastos del mes por categoría" icono="gastos">
          {r.gastosPorCategoria.length === 0 ? <Vacio>Sin gastos este mes</Vacio> : (
            <ul className="space-y-2">
              {r.gastosPorCategoria.map((g) => (
                <li key={g.categoria} className="text-sm">
                  <div className="flex justify-between"><span>{g.categoria}</span><span className="num text-tinta-2">{formatoUsd(g.usd)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-1.5 rounded-full" style={{ width: `${(g.usd / r.gastosPorCategoria[0].usd) * 100}%`, background: "var(--series-2)" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Resumen por periodo" icono="tasa">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-tinta-3">
              <tr><th className="py-1 font-medium">Periodo</th><th className="pl-3 text-right font-medium">Ventas</th><th className="pl-3 text-right font-medium">Gastos</th><th className="pl-3 text-right font-medium">Ganancia</th><th className="hidden pl-3 text-right font-medium sm:table-cell">Ticket prom.</th></tr>
            </thead>
            <tbody className="num">
              {r.periodos.map((p) => (
                <tr key={p.nombre} className="border-t border-borde">
                  <td className="py-1.5">{p.nombre}</td>
                  <td className="pl-3 text-right">{formatoUsd(p.ventasUsd)}</td>
                  <td className="pl-3 text-right">{formatoUsd(p.gastosUsd)}</td>
                  <td className={`pl-3 text-right font-medium ${p.gananciaUsd < 0 ? "text-peligro" : ""}`}>{formatoUsd(p.gananciaUsd)}</td>
                  <td className="hidden pl-3 text-right text-tinta-2 sm:table-cell">{formatoUsd(p.ticketPromedioUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}

const TONOS = {
  turquesa: { chip: "bg-turquesa-suave text-turquesa", borde: "border border-borde bg-surface" },
  azul: { chip: "bg-azul-suave text-azul", borde: "border border-borde bg-surface" },
  degradado: { chip: "degradado text-acento-tinta", borde: "borde-degradado" },
};

function Kpi({ titulo, icono, tono, usd, tasa, pie }: { titulo: string; icono: string; tono: keyof typeof TONOS; usd: number; tasa: number; pie?: string }) {
  const t = TONOS[tono];
  return (
    <div className={`rounded-2xl p-3.5 ${t.borde}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-tinta-2">{titulo}</span>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${t.chip}`}><Icono nombre={icono} className="h-4 w-4" /></span>
      </div>
      <div className={`num mt-2 text-2xl font-semibold tracking-tight ${usd < 0 ? "text-peligro" : "text-tinta"}`}>{formatoUsd(usd)}</div>
      {tasa > 0 && <div className="num text-xs text-tinta-3">{formatoBs(usd * tasa)}</div>}
      {pie && <div className="mt-1.5 text-xs text-tinta-3">{pie}</div>}
    </div>
  );
}
