"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BANCOS, METODOS_PAGO, monedaDeMetodo } from "@/lib/rubros";
import { formatoBs, formatoUsd } from "@/lib/dinero";
import type { Producto } from "@/lib/store/esquema";
import type { PagoLeido } from "@/lib/ai/lector";
import { Campo, claseBoton, claseBotonSec, claseInput } from "./ui";
import { LectorArchivo } from "./LectorArchivo";
import { enviar, num } from "./cliente";

function useEnvio() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function correr(fn: () => Promise<unknown>, exito: string) {
    setMsg(null);
    setOcupado(true);
    try {
      await fn();
      setMsg({ ok: true, texto: exito });
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : "Error" });
      return false;
    } finally {
      setOcupado(false);
    }
  }
  const aviso = msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-peligro"}`}>{msg.texto}</p>;
  return { correr, ocupado, aviso };
}

/** Marcar como pagada una venta por cobrar. */
export function CobrarVenta({ ventaId, totalUsd, tasa, lectorActivo }: { ventaId: string; totalUsd: number; tasa: number; lectorActivo: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [metodo, setMetodo] = useState("Pago Móvil");
  const [moneda, setMoneda] = useState<"Bs" | "USD">("Bs");
  const [monto, setMonto] = useState("");
  const [banco, setBanco] = useState("");
  const [referencia, setReferencia] = useState("");
  const [linkCapture, setLink] = useState("");
  const { correr, ocupado, aviso } = useEnvio();
  if (!abierto) return <button type="button" className="text-xs font-medium text-acento" onClick={() => setAbierto(true)}>Cobrar</button>;
  const sugerido = moneda === "USD" ? totalUsd : totalUsd * tasa;
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-surface-2 p-3">
      {lectorActivo && (
        <LectorArchivo<PagoLeido> tipo="pago" texto="Leer capture" onLeido={(d, link) => {
          setMetodo((METODOS_PAGO as readonly string[]).includes(d.tipo) ? d.tipo : "Otro");
          setMoneda(d.moneda); setMonto(String(d.monto).replace(".", ",")); setReferencia(d.referencia); setBanco(d.bancoOrigen); setLink(link);
        }} />
      )}
      <div className="grid grid-cols-2 gap-2">
        <select className={claseInput} value={metodo} onChange={(e) => { setMetodo(e.target.value); setMoneda(monedaDeMetodo(e.target.value)); }}>
          {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className={claseInput} value={moneda} onChange={(e) => setMoneda(e.target.value as "Bs" | "USD")}><option>Bs</option><option>USD</option></select>
        <input className={`${claseInput} num`} inputMode="decimal" placeholder={sugerido.toLocaleString("es-VE", { maximumFractionDigits: 2 })} value={monto} onChange={(e) => setMonto(e.target.value)} />
        <input className={`${claseInput} num`} placeholder="Referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        <input className={`${claseInput} col-span-2`} list="bancos-cobro" placeholder="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
        <datalist id="bancos-cobro">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist>
      </div>
      {aviso}
      <div className="flex gap-2">
        <button type="button" className={claseBoton} disabled={ocupado} onClick={() => correr(() => enviar(`/api/ventas/${ventaId}/cobrar`, { metodo, moneda, monto: monto ? num(monto) : undefined, banco, referencia, linkCapture }), "Cobro registrado")}>
          Confirmar cobro
        </button>
        <button type="button" className={claseBotonSec} onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </div>
  );
}

/** Entrada, salida o conteo físico de inventario. */
export function MovimientoInventario({ productos }: { productos: Producto[] }) {
  const inventariables = productos.filter((p) => p.controlaStock === "sí");
  const [productoId, setProductoId] = useState(inventariables[0]?.id ?? "");
  const [tipo, setTipo] = useState<"entrada" | "salida" | "conteo">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [nota, setNota] = useState("");
  const { correr, ocupado, aviso } = useEnvio();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Producto">
          <select className={claseInput} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            {inventariables.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Movimiento">
          <select className={claseInput} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="entrada">Entrada (compra / producción)</option>
            <option value="salida">Salida (merma / consumo)</option>
            <option value="conteo">Conteo físico (fija el stock)</option>
          </select>
        </Campo>
        <Campo etiqueta={tipo === "conteo" ? "Cantidad contada" : "Cantidad"}>
          <input className={`${claseInput} num`} inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </Campo>
        {tipo === "entrada" ? (
          <Campo etiqueta="Costo unitario USD (opcional)"><input className={`${claseInput} num`} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
        ) : (
          <Campo etiqueta="Nota"><input className={claseInput} value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
        )}
      </div>
      {aviso}
      <button type="button" className={`${claseBoton} w-full`} disabled={ocupado || !productoId || cantidad === ""}
        onClick={async () => {
          const ok = await correr(() => enviar("/api/inventario", { productoId, tipo, cantidad: num(cantidad), costoUnitUsd: costo ? num(costo) : undefined, nota: nota || undefined }), "Inventario actualizado");
          if (ok) { setCantidad(""); setCosto(""); setNota(""); }
        }}>
        Guardar movimiento
      </button>
    </div>
  );
}

/** Crear o editar un producto / servicio. */
export function FormProducto({ producto, categorias, controlaStockPorDefecto, onListo }: { producto?: Producto; categorias: string[]; controlaStockPorDefecto: boolean; onListo?: () => void }) {
  const [f, setF] = useState({
    nombre: producto?.nombre ?? "", categoria: producto?.categoria ?? categorias[0] ?? "", unidad: producto?.unidad ?? "und",
    precioUsd: producto ? String(producto.precioUsd).replace(".", ",") : "", costoUsd: producto ? String(producto.costoUsd).replace(".", ",") : "",
    stockMinimo: producto ? String(producto.stockMinimo) : "", controlaStock: producto ? producto.controlaStock === "sí" : controlaStockPorDefecto,
    activo: producto ? producto.activo !== "no" : true,
  });
  const { correr, ocupado, aviso } = useEnvio();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Campo etiqueta="Nombre"><input className={claseInput} value={f.nombre} onChange={set("nombre")} /></Campo></div>
        <Campo etiqueta="Categoría">
          <input className={claseInput} list="cats" value={f.categoria} onChange={set("categoria")} />
          <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        </Campo>
        <Campo etiqueta="Unidad"><input className={claseInput} value={f.unidad} onChange={set("unidad")} placeholder="und, kg, l…" /></Campo>
        <Campo etiqueta="Precio de venta USD" ayuda="0 si es solo insumo"><input className={`${claseInput} num`} inputMode="decimal" value={f.precioUsd} onChange={set("precioUsd")} /></Campo>
        <Campo etiqueta="Costo USD"><input className={`${claseInput} num`} inputMode="decimal" value={f.costoUsd} onChange={set("costoUsd")} /></Campo>
        <Campo etiqueta="Stock mínimo"><input className={`${claseInput} num`} inputMode="decimal" value={f.stockMinimo} onChange={set("stockMinimo")} /></Campo>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.controlaStock} onChange={(e) => setF({ ...f, controlaStock: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Controla inventario</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Activo</label>
        </div>
      </div>
      {aviso}
      <button type="button" className={`${claseBoton} w-full`} disabled={ocupado || !f.nombre}
        onClick={async () => {
          const ok = await correr(() => enviar("/api/productos", {
            id: producto?.id, nombre: f.nombre, categoria: f.categoria, unidad: f.unidad, precioUsd: num(f.precioUsd), costoUsd: num(f.costoUsd),
            stockMinimo: num(f.stockMinimo), controlaStock: f.controlaStock, activo: f.activo,
          }), producto ? "Producto actualizado" : "Producto creado");
          if (ok) {
            if (!producto) setF({ ...f, nombre: "", precioUsd: "", costoUsd: "", stockMinimo: "" });
            onListo?.();
          }
        }}>
        {producto ? "Guardar cambios" : "Crear"}
      </button>
    </div>
  );
}

export function EditarProducto(props: { producto: Producto; categorias: string[]; controlaStockPorDefecto: boolean }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <button type="button" className="text-xs font-medium text-acento" onClick={() => setAbierto(true)}>Editar</button>;
  return <div className="mt-3 w-full"><FormProducto {...props} onListo={() => setAbierto(false)} /></div>;
}

/** Carga manual de la tasa del día. */
export function FormTasa({ usd, eur }: { usd: number; eur: number }) {
  const [vUsd, setUsd] = useState(usd ? String(usd).replace(".", ",") : "");
  const [vEur, setEur] = useState(eur ? String(eur).replace(".", ",") : "");
  const { correr, ocupado, aviso } = useEnvio();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Tasa USD (Bs por $)"><input className={`${claseInput} num`} inputMode="decimal" value={vUsd} onChange={(e) => setUsd(e.target.value)} /></Campo>
        <Campo etiqueta="Tasa EUR (Bs por €)"><input className={`${claseInput} num`} inputMode="decimal" value={vEur} onChange={(e) => setEur(e.target.value)} /></Campo>
      </div>
      {aviso}
      <button type="button" className={`${claseBoton} w-full`} disabled={ocupado || !num(vUsd)}
        onClick={() => correr(() => enviar("/api/tasa", { usd: num(vUsd), eur: num(vEur) }), "Tasa guardada para hoy")}>
        Guardar tasa de hoy
      </button>
      <p className="text-xs text-tinta-3">Ej.: {formatoUsd(1)} = {formatoBs(num(vUsd))}</p>
    </div>
  );
}
