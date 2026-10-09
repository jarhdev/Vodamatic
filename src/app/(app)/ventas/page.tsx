import { getStore } from "@/lib/store";
import { tasaNegocio } from "@/lib/services/tasas";
import { lectorDisponible } from "@/lib/ai/lector";
import { requerirSesion } from "@/lib/sesion";
import { sumarDias, hoy } from "@/lib/fechas";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import { NuevaVenta } from "@/components/NuevaVenta";
import { BotonAccion } from "@/components/BotonAccion";
import { Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Ventas() {
  const sesion = await requerirSesion();
  const store = getStore();
  const [productos, ventas, t] = await Promise.all([store.listar("productos"), store.listar("ventas"), tasaNegocio().catch(() => null)]);
  const vendibles = productos.filter((p) => p.activo !== "no" && p.precioUsd > 0);
  const recientes = ventas.filter((v) => v.fecha >= sumarDias(hoy(), -7)).reverse().slice(0, 25);

  return (
    <div className="space-y-4">
      <Titulo sub={t ? undefined : "⚠ No hay tasa del día. Cárgala tocando el botón de tasa arriba."}>Nueva venta</Titulo>
      <Tarjeta>
        {t ? <NuevaVenta productos={vendibles} tasa={t.valor} lectorActivo={lectorDisponible()} /> : <Vacio>Carga la tasa para poder vender.</Vacio>}
      </Tarjeta>

      <Tarjeta titulo="Ventas recientes">
        {recientes.length === 0 ? <Vacio>Aún no hay ventas</Vacio> : (
          <ul className="divide-y divide-borde">
            {recientes.map((v) => (
              <li key={v.id} className={`py-2.5 ${v.anulado ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{v.items}</div>
                    <div className="text-xs text-tinta-3">
                      {v.fecha.slice(5).split("-").reverse().join("/")} {v.hora} · {v.metodo || "—"}{v.referencia ? ` · ref ${v.referencia}` : ""}{v.cliente ? ` · ${v.cliente}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-sm font-medium">{formatoUsd(v.totalUsd)}</div>
                    <div className="num text-xs text-tinta-3">{v.moneda === "Bs" ? formatoBs(v.monto) : ""}</div>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  {v.anulado ? <Etiqueta tono="peligro">Anulada</Etiqueta> : v.estado === "pendiente" ? <Etiqueta tono="aviso">Por cobrar</Etiqueta> : null}
                  {v.linkCapture && <a href={v.linkCapture} target="_blank" className="text-xs text-acento">Ver capture</a>}
                  {!v.anulado && sesion.rol === "admin" && (
                    <BotonAccion url={`/api/ventas/${v.id}/anular`} texto="Anular" confirmar={`¿Anular la venta ${v.id}? Se devuelve el inventario.`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
