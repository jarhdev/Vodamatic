import { getStore } from "@/lib/store";
import { config } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { tasaDelDia } from "@/lib/services/tasas";
import { formatoTasa } from "@/lib/dinero";
import { FormTasa } from "@/components/Formularios";
import { Tarjeta, Titulo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Tasa() {
  const sesion = await requerirSesion();
  const t = await tasaDelDia();
  const historial = (await getStore().listar("tasas")).slice(-15).reverse();
  return (
    <div className="space-y-4">
      <Titulo sub={`Este negocio convierte sus precios con la tasa BCV del ${config.tasaReferencia === "eur" ? "euro" : "dólar"}.`}>Tasa del día</Titulo>
      <div className="grid grid-cols-2 gap-3">
        <Tarjeta><div className="text-xs text-tinta-2">Dólar BCV</div><div className="num text-2xl font-semibold">{t.usd ? formatoTasa(t.usd) : "—"}</div></Tarjeta>
        <Tarjeta><div className="text-xs text-tinta-2">Euro BCV</div><div className="num text-2xl font-semibold">{t.eur ? formatoTasa(t.eur) : "—"}</div></Tarjeta>
      </div>
      <p className="text-xs text-tinta-3">Fuente: {t.fuente} · {t.consultada}</p>
      {sesion.rol === "admin" && (
        <Tarjeta titulo="Cargar tasa manualmente">
          <FormTasa usd={t.usd} eur={t.eur} />
        </Tarjeta>
      )}
      <Tarjeta titulo="Historial">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-tinta-3"><tr><th className="py-1 font-medium">Fecha</th><th className="text-right font-medium">USD</th><th className="text-right font-medium">EUR</th><th className="pl-3 font-medium">Fuente</th></tr></thead>
          <tbody className="num">
            {historial.map((h, i) => (
              <tr key={i} className="border-t border-borde"><td className="py-1.5">{h.fecha}</td><td className="text-right">{formatoTasa(h.usd)}</td><td className="text-right">{h.eur ? formatoTasa(h.eur) : "—"}</td><td className="pl-3 text-tinta-3">{h.fuente}</td></tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  );
}
