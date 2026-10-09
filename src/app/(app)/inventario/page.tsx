import { getStore } from "@/lib/store";
import { calcularStock } from "@/lib/services/inventario";
import { requerirSesion } from "@/lib/sesion";
import { formatoUsd } from "@/lib/dinero";
import { MovimientoInventario } from "@/components/Formularios";
import { Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Inventario() {
  const sesion = await requerirSesion();
  const store = getStore();
  const [productos, movimientos] = await Promise.all([store.listar("productos"), store.listar("movimientos")]);
  const stock = calcularStock(productos, movimientos);
  const valor = stock.reduce((s, l) => s + l.valorUsd, 0);
  const recientes = movimientos.filter((m) => !m.anulado).reverse().slice(0, 15);

  return (
    <div className="space-y-4">
      <Titulo sub="Las ventas descuentan y las facturas de compra suman automáticamente.">Inventario</Titulo>

      <Tarjeta titulo="Stock actual" icono="inventario" accion={<span className="text-xs text-tinta-2">Valor: <span className="num font-medium text-tinta">{formatoUsd(valor)}</span></span>}>
        {stock.length === 0 ? <Vacio>Ningún producto controla inventario. Actívalo en Productos.</Vacio> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-tinta-3">
                <tr><th className="py-1 font-medium">Producto</th><th className="pl-3 text-right font-medium">Stock</th><th className="pl-3 text-right font-medium">Mín.</th><th className="pl-3 font-medium">Estado</th></tr>
              </thead>
              <tbody>
                {stock.map((l) => (
                  <tr key={l.producto.id} className="border-t border-borde">
                    <td className="py-2">{l.producto.nombre} <span className="text-xs text-tinta-3">{l.producto.unidad}</span></td>
                    <td className="num pl-3 text-right font-medium">{l.stock}</td>
                    <td className="num pl-3 text-right text-tinta-3">{l.producto.stockMinimo}</td>
                    <td className="pl-3">
                      <Etiqueta tono={l.estado === "OK" ? "ok" : l.estado === "Bajo" ? "aviso" : "peligro"}>
                        {l.estado === "OK" ? "✓" : l.estado === "Bajo" ? "⚠" : "⛔"} {l.estado}
                      </Etiqueta>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {sesion.rol === "admin" && (
        <Tarjeta titulo="Registrar movimiento" icono="mas">
          <MovimientoInventario productos={productos.filter((p) => p.activo !== "no")} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Últimos movimientos" icono="tasa">
        {recientes.length === 0 ? <Vacio>Sin movimientos</Vacio> : (
          <ul className="divide-y divide-borde text-sm">
            {recientes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate">{m.producto}</div>
                  <div className="text-xs text-tinta-3">{m.fecha.slice(5).split("-").reverse().join("/")} · {m.origen}{m.nota ? ` · ${m.nota}` : ""}</div>
                </div>
                <span className={`num font-medium ${m.cantidad < 0 ? "text-peligro" : "text-ok"}`}>{m.cantidad > 0 ? "+" : ""}{m.cantidad}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
