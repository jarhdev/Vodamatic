import { getStore } from "@/lib/store";
import { config } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { tasaNegocio } from "@/lib/services/tasas";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import { EditarProducto, FormProducto } from "@/components/Formularios";
import { Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Productos() {
  const sesion = await requerirSesion();
  const [productos, t] = await Promise.all([getStore().listar("productos"), tasaNegocio().catch(() => null)]);
  const p = config.plantilla;
  const categorias = [...new Set([...p.categoriasProducto, ...productos.map((x) => x.categoria).filter(Boolean)])];
  const porCategoria = Map.groupBy(productos, (x) => x.categoria || "Sin categoría");

  return (
    <div className="space-y-4">
      <Titulo sub="Precios en USD; el equivalente en Bs se calcula con la tasa del día.">{p.itemPlural}</Titulo>
      {sesion.rol === "admin" && (
        <Tarjeta titulo={`Nuevo ${p.itemSingular.toLowerCase()}`}>
          <FormProducto categorias={categorias} controlaStockPorDefecto={p.controlaStockPorDefecto} />
        </Tarjeta>
      )}
      {productos.length === 0 && <Vacio>Aún no hay {p.itemPlural.toLowerCase()}.</Vacio>}
      {[...porCategoria.entries()].map(([cat, lista]) => (
        <Tarjeta key={cat} titulo={cat}>
          <ul className="divide-y divide-borde">
            {lista.map((x) => {
              const margen = x.precioUsd > 0 && x.costoUsd > 0 ? Math.round(((x.precioUsd - x.costoUsd) / x.precioUsd) * 100) : null;
              return (
                <li key={x.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 ${x.activo === "no" ? "opacity-50" : ""}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{x.nombre}</div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs text-tinta-3">
                      <span>costo {formatoUsd(x.costoUsd)}</span>
                      {margen != null && <span>· margen {margen}%</span>}
                      {x.controlaStock === "sí" && <Etiqueta>inventario</Etiqueta>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="num text-sm font-medium">{x.precioUsd > 0 ? formatoUsd(x.precioUsd) : "insumo"}</div>
                      {t && x.precioUsd > 0 && <div className="num text-xs text-tinta-3">{formatoBs(x.precioUsd * t.valor)}</div>}
                    </div>
                    {sesion.rol === "admin" && <EditarProducto producto={x} categorias={categorias} controlaStockPorDefecto={p.controlaStockPorDefecto} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      ))}
    </div>
  );
}
