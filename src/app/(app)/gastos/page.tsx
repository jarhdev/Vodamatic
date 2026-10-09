import { getStore } from "@/lib/store";
import { config } from "@/lib/config";
import { tasaNegocio } from "@/lib/services/tasas";
import { lectorDisponible } from "@/lib/ai/lector";
import { requerirSesion } from "@/lib/sesion";
import { inicioMes, hoy } from "@/lib/fechas";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import { NuevoGasto } from "@/components/NuevoGasto";
import { BotonAccion } from "@/components/BotonAccion";
import { Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Gastos() {
  const sesion = await requerirSesion();
  const store = getStore();
  const [productos, gastos, t] = await Promise.all([store.listar("productos"), store.listar("gastos"), tasaNegocio().catch(() => null)]);
  const delMes = gastos.filter((g) => g.fecha >= inicioMes(hoy())).reverse();
  const totalMes = delMes.filter((g) => !g.anulado).reduce((s, g) => s + g.montoUsd, 0);

  return (
    <div className="space-y-4">
      <Titulo sub="Toma foto a la factura y la app llena el gasto y suma la mercancía al inventario.">Nuevo gasto</Titulo>
      <Tarjeta destacada>
        {t ? (
          <NuevoGasto productos={productos.filter((p) => p.activo !== "no")} categorias={config.plantilla.categoriasGasto} tasa={t.valor} lectorActivo={lectorDisponible()} />
        ) : <Vacio>Carga la tasa del día para registrar gastos.</Vacio>}
      </Tarjeta>

      <Tarjeta titulo="Gastos de este mes" icono="gastos" accion={<span className="num text-sm font-medium">{formatoUsd(totalMes)}</span>}>
        {delMes.length === 0 ? <Vacio>Sin gastos este mes</Vacio> : (
          <ul className="divide-y divide-borde">
            {delMes.map((g) => (
              <li key={g.id} className={`py-2.5 ${g.anulado ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{g.concepto}</div>
                    <div className="text-xs text-tinta-3">{g.fecha.slice(5).split("-").reverse().join("/")} · {g.categoria}{g.proveedor ? ` · ${g.proveedor}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-sm font-medium">{formatoUsd(g.montoUsd)}</div>
                    <div className="num text-xs text-tinta-3">{g.moneda === "Bs" ? formatoBs(g.monto) : ""}</div>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  {g.anulado && <Etiqueta tono="peligro">Anulado</Etiqueta>}
                  {g.linkCapture && <a href={g.linkCapture} target="_blank" className="text-xs text-acento">Ver factura</a>}
                  {!g.anulado && sesion.rol === "admin" && <BotonAccion url={`/api/gastos/${g.id}/anular`} texto="Anular" confirmar="¿Anular este gasto? Si sumó inventario, se descuenta." />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
