"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BANCOS, METODOS_PAGO, monedaDeMetodo } from "@/lib/rubros";
import { formatoBs, formatoUsd, redondear } from "@/lib/dinero";
import type { Producto } from "@/lib/store/esquema";
import type { PagoLeido } from "@/lib/ai/lector";
import { Campo, claseBoton, claseInput } from "./ui";
import { LectorArchivo } from "./LectorArchivo";
import { enviar, idSolicitud, num } from "./cliente";

interface Linea {
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUsd: number;
}

export function NuevaVenta({ productos, tasa, lectorActivo }: { productos: Producto[]; tasa: number; lectorActivo: boolean }) {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [libre, setLibre] = useState({ descripcion: "", precio: "" });
  const [porCobrar, setPorCobrar] = useState(false);
  const [metodo, setMetodo] = useState<string>("Pago Móvil");
  const [moneda, setMoneda] = useState<"Bs" | "USD">("Bs");
  const [monto, setMonto] = useState("");
  const [banco, setBanco] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cliente, setCliente] = useState("");
  const [fechaEsperada, setFechaEsperada] = useState("");
  const [linkCapture, setLinkCapture] = useState("");
  const [requestId, setRequestId] = useState(idSolicitud);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const totalUsd = redondear(lineas.reduce((s, l) => s + l.cantidad * l.precioUsd, 0));
  const totalEnMoneda = moneda === "USD" ? totalUsd : redondear(totalUsd * tasa);
  const montoNum = monto ? num(monto) : totalEnMoneda;
  const pagadoUsd = moneda === "USD" ? montoNum : montoNum / tasa;
  const diferenciaUsd = redondear(pagadoUsd - totalUsd);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
  }, [productos, busqueda]);

  function agregar(p: Producto) {
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productoId === p.id);
      if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...ls, { productoId: p.id, descripcion: p.nombre, cantidad: 1, precioUsd: p.precioUsd }];
    });
  }

  function cambiarCantidad(i: number, delta: number) {
    setLineas((ls) => ls.flatMap((l, k) => (k !== i ? [l] : l.cantidad + delta <= 0 ? [] : [{ ...l, cantidad: l.cantidad + delta }])));
  }

  function usarCapture(d: PagoLeido, link: string) {
    const met = d.tipo === "Efectivo" ? (d.moneda === "USD" ? "Efectivo USD" : "Efectivo Bs") : d.tipo;
    setMetodo((METODOS_PAGO as readonly string[]).includes(met) ? met : "Otro");
    setMoneda(d.moneda);
    if (d.monto) setMonto(String(d.monto).replace(".", ","));
    setReferencia(d.referencia);
    setBanco(BANCOS.find((b) => d.bancoOrigen.toLowerCase().includes(b.toLowerCase())) ?? d.bancoOrigen);
    if (d.emisor && !cliente) setCliente(d.emisor);
    setLinkCapture(link);
    setEstado({ tipo: "ok", msg: "Capture leído. Revisa los datos antes de guardar." });
  }

  async function guardar() {
    setEstado(null);
    setEnviando(true);
    try {
      await enviar("/api/ventas", {
        items: lineas,
        porCobrar,
        fechaEsperada,
        cliente,
        linkCapture,
        requestId,
        pago: porCobrar ? undefined : { moneda, monto: monto ? num(monto) : undefined, metodo, banco, referencia },
      });
      setLineas([]); setMonto(""); setReferencia(""); setBanco(""); setCliente(""); setLinkCapture(""); setPorCobrar(false); setFechaEsperada("");
      setRequestId(idSolicitud());
      setEstado({ tipo: "ok", msg: `Venta registrada: ${formatoUsd(totalUsd)}` });
      router.refresh();
    } catch (e) {
      setEstado({ tipo: "error", msg: e instanceof Error ? e.message : "Error" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input className={claseInput} placeholder="Buscar producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {visibles.map((p) => (
            <button key={p.id} type="button" onClick={() => agregar(p)}
              className="rounded-xl border border-borde bg-surface-2 p-2.5 text-left transition hover:border-turquesa/70 hover:bg-surface-3 active:scale-[0.98]">
              <div className="truncate text-sm font-medium">{p.nombre}</div>
              <div className="num text-xs text-tinta-2">{formatoUsd(p.precioUsd)} · {formatoBs(p.precioUsd * tasa)}</div>
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={claseInput} placeholder="Otro (descripción)" value={libre.descripcion} onChange={(e) => setLibre({ ...libre, descripcion: e.target.value })} />
          <input className={`${claseInput} w-28`} inputMode="decimal" placeholder="USD" value={libre.precio} onChange={(e) => setLibre({ ...libre, precio: e.target.value })} />
          <button type="button" className="rounded-xl border border-borde px-3 text-sm" disabled={!libre.descripcion || !num(libre.precio)}
            onClick={() => { setLineas((ls) => [...ls, { productoId: "", descripcion: libre.descripcion, cantidad: 1, precioUsd: num(libre.precio) }]); setLibre({ descripcion: "", precio: "" }); }}>
            +
          </button>
        </div>
      </div>

      {lineas.length > 0 && (
        <ul className="divide-y divide-borde rounded-xl border border-borde">
          {lineas.map((l, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{l.descripcion}</div>
                <div className="num text-xs text-tinta-3">{formatoUsd(l.precioUsd)} c/u</div>
              </div>
              <button type="button" aria-label="Quitar uno" className="h-8 w-8 rounded-lg border border-borde" onClick={() => cambiarCantidad(i, -1)}>−</button>
              <span className="num w-6 text-center text-sm">{l.cantidad}</span>
              <button type="button" aria-label="Agregar uno" className="h-8 w-8 rounded-lg border border-borde" onClick={() => cambiarCantidad(i, 1)}>+</button>
              <span className="num w-20 text-right text-sm font-medium">{formatoUsd(l.cantidad * l.precioUsd)}</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between bg-turquesa-suave px-3 py-2.5">
            <span className="text-sm font-medium">Total</span>
            <span className="text-right">
              <span className="num block text-xl font-semibold text-turquesa">{formatoUsd(totalUsd)}</span>
              <span className="num block text-xs text-tinta-2">{formatoBs(totalUsd * tasa)}</span>
            </span>
          </li>
        </ul>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={porCobrar} onChange={(e) => setPorCobrar(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        Por cobrar (fiado / pago después)
      </label>

      {porCobrar ? (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Cliente"><input className={claseInput} value={cliente} onChange={(e) => setCliente(e.target.value)} required /></Campo>
          <Campo etiqueta="Fecha esperada de pago"><input type="date" className={claseInput} value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} /></Campo>
        </div>
      ) : (
        <div className="space-y-3">
          {lectorActivo && <LectorArchivo<PagoLeido> tipo="pago" texto="Leer capture de pago" onLeido={usarCapture} />}
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Método">
              <select className={claseInput} value={metodo} onChange={(e) => { setMetodo(e.target.value); setMoneda(monedaDeMetodo(e.target.value)); setMonto(""); }}>
                {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Moneda">
              <select className={claseInput} value={moneda} onChange={(e) => { setMoneda(e.target.value as "Bs" | "USD"); setMonto(""); }}>
                <option>Bs</option>
                <option>USD</option>
              </select>
            </Campo>
            <Campo etiqueta={`Monto recibido (${moneda})`} ayuda={diferenciaUsd !== 0 && lineas.length ? `Diferencia: ${formatoUsd(diferenciaUsd)}` : undefined}>
              <input className={`${claseInput} num`} inputMode="decimal" placeholder={totalEnMoneda.toLocaleString("es-VE")} value={monto} onChange={(e) => setMonto(e.target.value)} />
            </Campo>
            <Campo etiqueta="Referencia"><input className={`${claseInput} num`} inputMode="numeric" value={referencia} onChange={(e) => setReferencia(e.target.value)} /></Campo>
            {moneda === "Bs" && metodo !== "Efectivo Bs" && (
              <Campo etiqueta="Banco">
                <input className={claseInput} list="bancos" value={banco} onChange={(e) => setBanco(e.target.value)} />
                <datalist id="bancos">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist>
              </Campo>
            )}
            <Campo etiqueta="Cliente (opcional)"><input className={claseInput} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          </div>
        </div>
      )}

      {estado && <p className={`text-sm ${estado.tipo === "ok" ? "text-ok" : "text-peligro"}`}>{estado.msg}</p>}

      <button type="button" className={`${claseBoton} w-full`} disabled={!lineas.length || enviando || (porCobrar && !cliente)} onClick={guardar}>
        {enviando ? "Guardando…" : porCobrar ? "Registrar venta por cobrar" : `Registrar venta · ${formatoUsd(totalUsd)}`}
      </button>
    </div>
  );
}
