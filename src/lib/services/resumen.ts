import { hoy, inicioMes, inicioSemana, sumarDias } from "../fechas";
import { redondear } from "../dinero";
import type { DetalleVenta, Gasto, Venta } from "../store";

export interface Periodo {
  nombre: string;
  desde: string;
  hasta: string;
  ventasUsd: number;
  cobradoUsd: number;
  gastosUsd: number;
  gananciaUsd: number;
  nVentas: number;
  ticketPromedioUsd: number;
}

function periodo(nombre: string, desde: string, hasta: string, ventas: Venta[], gastos: Gasto[]): Periodo {
  const vs = ventas.filter((v) => !v.anulado && v.fecha >= desde && v.fecha <= hasta);
  const gs = gastos.filter((g) => !g.anulado && g.fecha >= desde && g.fecha <= hasta);
  const ventasUsd = redondear(vs.reduce((s, v) => s + (v.totalUsd || v.montoUsd), 0));
  const cobradoUsd = redondear(vs.filter((v) => v.estado !== "pendiente").reduce((s, v) => s + v.montoUsd, 0));
  const gastosUsd = redondear(gs.reduce((s, g) => s + g.montoUsd, 0));
  return {
    nombre, desde, hasta, ventasUsd, cobradoUsd, gastosUsd, gananciaUsd: redondear(ventasUsd - gastosUsd), nVentas: vs.length,
    ticketPromedioUsd: vs.length ? redondear(ventasUsd / vs.length) : 0,
  };
}

export function calcularResumen(ventas: Venta[], gastos: Gasto[], detalle: DetalleVenta[], fecha = hoy()) {
  const semana = inicioSemana(fecha);
  const periodos = [
    periodo("Hoy", fecha, fecha, ventas, gastos),
    periodo("Ayer", sumarDias(fecha, -1), sumarDias(fecha, -1), ventas, gastos),
    periodo("Esta semana", semana, fecha, ventas, gastos),
    periodo("Semana pasada", sumarDias(semana, -7), sumarDias(semana, -1), ventas, gastos),
    periodo("Este mes", inicioMes(fecha), fecha, ventas, gastos),
  ];

  // Ventas por día de los últimos 14 días, para la gráfica.
  const porDia = Array.from({ length: 14 }, (_, i) => {
    const d = sumarDias(fecha, i - 13);
    const p = periodo(d, d, d, ventas, gastos);
    return { fecha: d, ventasUsd: p.ventasUsd, gastosUsd: p.gastosUsd };
  });

  const top = new Map<string, { producto: string; cantidad: number; usd: number }>();
  for (const d of detalle) {
    if (d.anulado || d.fecha < semana) continue;
    const k = d.productoId || d.producto;
    const t = top.get(k) ?? { producto: d.producto, cantidad: 0, usd: 0 };
    t.cantidad += d.cantidad;
    t.usd = redondear(t.usd + d.subtotalUsd);
    top.set(k, t);
  }
  const topSemana = [...top.values()].sort((a, b) => b.usd - a.usd).slice(0, 5);

  const pendientes = ventas.filter((v) => !v.anulado && v.estado === "pendiente");
  const porCobrarUsd = redondear(pendientes.reduce((s, v) => s + v.totalUsd, 0));

  const gastosPorCategoria = new Map<string, number>();
  for (const g of gastos) {
    if (g.anulado || g.fecha < inicioMes(fecha)) continue;
    gastosPorCategoria.set(g.categoria || "Otros", redondear((gastosPorCategoria.get(g.categoria || "Otros") ?? 0) + g.montoUsd));
  }

  return {
    periodos, porDia, topSemana, porCobrarUsd, nPendientes: pendientes.length,
    gastosPorCategoria: [...gastosPorCategoria.entries()].map(([categoria, usd]) => ({ categoria, usd })).sort((a, b) => b.usd - a.usd),
  };
}
