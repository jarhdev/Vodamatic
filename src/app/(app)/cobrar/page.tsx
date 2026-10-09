import { getStore } from "@/lib/store";
import { tasaNegocio } from "@/lib/services/tasas";
import { lectorDisponible } from "@/lib/ai/lector";
import { hoy } from "@/lib/fechas";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import { CobrarVenta } from "@/components/Formularios";
import { Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PorCobrar() {
  const store = getStore();
  const [ventas, t] = await Promise.all([store.listar("ventas"), tasaNegocio().catch(() => null)]);
  const pendientes = ventas.filter((v) => !v.anulado && v.estado === "pendiente").sort((a, b) => (a.fechaEsperada || "9").localeCompare(b.fechaEsperada || "9"));
  const total = pendientes.reduce((s, v) => s + v.totalUsd, 0);
  const tasa = t?.valor ?? 0;
  const f = hoy();

  return (
    <div className="space-y-4">
      <Titulo sub="Ventas a crédito. Al cobrarlas se usa la tasa del día del pago.">Por cobrar</Titulo>
      <Tarjeta titulo={`${pendientes.length} pendientes`} accion={<span className="text-right"><span className="num block font-semibold">{formatoUsd(total)}</span>{tasa > 0 && <span className="num block text-xs text-tinta-3">{formatoBs(total * tasa)}</span>}</span>}>
        {pendientes.length === 0 ? <Vacio>No hay cuentas por cobrar 🎉</Vacio> : (
          <ul className="divide-y divide-borde">
            {pendientes.map((v) => {
              const vencida = v.fechaEsperada && v.fechaEsperada < f;
              return (
                <li key={v.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{v.cliente || "Sin nombre"}</div>
                      <div className="truncate text-sm text-tinta-2">{v.items}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tinta-3">
                        <span>Vendido {v.fecha.split("-").reverse().join("/")}</span>
                        {v.fechaEsperada && <Etiqueta tono={vencida ? "peligro" : "neutro"}>{vencida ? "Vencida" : "Paga"} {v.fechaEsperada.split("-").reverse().join("/")}</Etiqueta>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num font-semibold">{formatoUsd(v.totalUsd)}</div>
                      {tasa > 0 && <div className="num text-xs text-tinta-3">{formatoBs(v.totalUsd * tasa)}</div>}
                    </div>
                  </div>
                  {tasa > 0 && <CobrarVenta ventaId={v.id} totalUsd={v.totalUsd} tasa={tasa} lectorActivo={lectorDisponible()} />}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
