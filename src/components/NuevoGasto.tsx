"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { METODOS_PAGO, monedaDeMetodo } from "@/lib/rubros";
import { formatoBs, formatoUsd, redondear } from "@/lib/dinero";
import type { Producto } from "@/lib/store/esquema";
import type { FacturaLeida } from "@/lib/ai/lector";
import { Campo, claseBoton, claseInput } from "./ui";
import { LectorArchivo } from "./LectorArchivo";
import { enviar, idSolicitud, num } from "./cliente";
import { sugerirProducto } from "@/lib/emparejar";

interface Item {
  productoId: string;
  descripcion: string;
  cantidad: string;
  costoUnit: string;
}

export function NuevoGasto({ productos, categorias, tasa, lectorActivo }: { productos: Producto[]; categorias: string[]; tasa: number; lectorActivo: boolean }) {
  const router = useRouter();
  const inventariables = productos.filter((p) => p.controlaStock === "sí");
  const vacio = { concepto: "", categoria: categorias[0] ?? "Otros", proveedor: "", rif: "", nroFactura: "", moneda: "Bs" as "Bs" | "USD", monto: "", metodo: "Punto de venta", referencia: "" };
  const [f, setF] = useState(vacio);
  const [items, setItems] = useState<Item[]>([]);
  const [sumarInventario, setSumarInventario] = useState(true);
  const [linkCapture, setLinkCapture] = useState("");
  const [requestId, setRequestId] = useState(idSolicitud);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const montoNum = num(f.monto);
  const equivalente = f.moneda === "USD" ? formatoBs(montoNum * tasa) : formatoUsd(montoNum / tasa);

  function usarFactura(d: FacturaLeida, link: string) {
    setF({
      ...f,
      concepto: d.conceptoSugerido || f.concepto,
      categoria: categorias.includes(d.categoriaSugerida) ? d.categoriaSugerida : f.categoria,
      proveedor: d.proveedor, rif: d.rif, nroFactura: d.nroFactura, moneda: d.moneda,
      monto: d.total ? String(redondear(d.total)).replace(".", ",") : f.monto,
      metodo: (METODOS_PAGO as readonly string[]).includes(d.metodoPago) ? d.metodoPago : f.metodo,
    });
    // El IVA se reparte en el costo unitario para que el inventario refleje lo que realmente costó.
    const factorIva = d.subtotal > 0 && d.total > 0 ? d.total / d.subtotal : 1;
    setItems(d.items.map((i) => ({
      productoId: sugerirProducto(i.descripcion, inventariables),
      descripcion: i.descripcion,
      cantidad: String(i.cantidad || 1),
      costoUnit: String(redondear((i.precioUnitario || (i.total / (i.cantidad || 1))) * factorIva, 4)).replace(".", ","),
    })));
    setLinkCapture(link);
    setEstado({ tipo: "ok", msg: `Factura leída: ${d.items.length} renglones. Revisa y asocia los productos del inventario.` });
  }

  async function guardar() {
    setEstado(null);
    setEnviando(true);
    try {
      await enviar("/api/gastos", {
        ...f, monto: montoNum, linkCapture, requestId, sumarInventario,
        items: items.filter((i) => i.descripcion && num(i.cantidad) > 0).map((i) => ({ productoId: i.productoId, descripcion: i.descripcion, cantidad: num(i.cantidad), costoUnit: num(i.costoUnit) })),
      });
      setF(vacio); setItems([]); setLinkCapture(""); setRequestId(idSolicitud());
      setEstado({ tipo: "ok", msg: "Gasto registrado" });
      router.refresh();
    } catch (e) {
      setEstado({ tipo: "error", msg: e instanceof Error ? e.message : "Error" });
    } finally {
      setEnviando(false);
    }
  }

  const cambiarItem = (i: number, k: keyof Item, v: string) => setItems((its) => its.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  return (
    <div className="space-y-3">
      {lectorActivo && <LectorArchivo<FacturaLeida> tipo="factura" texto="Leer factura (foto o PDF)" onLeido={usarFactura} />}
      <Campo etiqueta="Concepto"><input className={claseInput} value={f.concepto} onChange={set("concepto")} placeholder="Compra de harina y aceite" /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Categoría">
          <select className={claseInput} value={f.categoria} onChange={set("categoria")}>{categorias.map((c) => <option key={c}>{c}</option>)}</select>
        </Campo>
        <Campo etiqueta="Proveedor"><input className={claseInput} value={f.proveedor} onChange={set("proveedor")} /></Campo>
        <Campo etiqueta="Método">
          <select className={claseInput} value={f.metodo} onChange={(e) => setF({ ...f, metodo: e.target.value, moneda: monedaDeMetodo(e.target.value) })}>
            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Moneda">
          <select className={claseInput} value={f.moneda} onChange={set("moneda")}><option>Bs</option><option>USD</option></select>
        </Campo>
        <Campo etiqueta={`Monto total (${f.moneda})`} ayuda={montoNum ? `≈ ${equivalente}` : undefined}>
          <input className={`${claseInput} num`} inputMode="decimal" value={f.monto} onChange={set("monto")} />
        </Campo>
        <Campo etiqueta="Nº factura / referencia"><input className={claseInput} value={f.nroFactura} onChange={set("nroFactura")} /></Campo>
      </div>

      <details className="rounded-xl border border-borde p-3" open={items.length > 0}>
        <summary className="cursor-pointer text-sm font-medium">Renglones de la factura ({items.length})</summary>
        <div className="mt-3 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-lg bg-surface-2 p-2">
              <input className={`${claseInput} col-span-12`} value={it.descripcion} onChange={(e) => cambiarItem(i, "descripcion", e.target.value)} />
              <select className={`${claseInput} col-span-12 sm:col-span-6`} value={it.productoId} onChange={(e) => cambiarItem(i, "productoId", e.target.value)}>
                <option value="">— No entra al inventario —</option>
                {inventariables.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <input className={`${claseInput} num col-span-4 sm:col-span-2`} inputMode="decimal" placeholder="Cant." value={it.cantidad} onChange={(e) => cambiarItem(i, "cantidad", e.target.value)} />
              <input className={`${claseInput} num col-span-6 sm:col-span-3`} inputMode="decimal" placeholder={`Costo unit. ${f.moneda}`} value={it.costoUnit} onChange={(e) => cambiarItem(i, "costoUnit", e.target.value)} />
              <button type="button" aria-label="Quitar renglón" className="col-span-2 sm:col-span-1 text-peligro" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-acento" onClick={() => setItems([...items, { productoId: "", descripcion: "", cantidad: "1", costoUnit: "" }])}>
            + Agregar renglón
          </button>
          {items.some((i) => i.productoId) && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sumarInventario} onChange={(e) => setSumarInventario(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Sumar estos productos al inventario
            </label>
          )}
        </div>
      </details>

      {estado && <p className={`text-sm ${estado.tipo === "ok" ? "text-ok" : "text-peligro"}`}>{estado.msg}</p>}
      <button type="button" className={`${claseBoton} w-full`} disabled={!f.concepto || !montoNum || enviando} onClick={guardar}>
        {enviando ? "Guardando…" : "Registrar gasto"}
      </button>
    </div>
  );
}
