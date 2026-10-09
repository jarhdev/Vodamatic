"use client";

import { useRef, useState } from "react";
import { claseBotonSec } from "./ui";
import { comprimirImagen } from "./cliente";
import { Icono } from "./Icono";

interface Props<T> {
  tipo: "factura" | "pago";
  texto: string;
  onLeido: (datos: T, link: string) => void;
}

/** Botón que toma foto / elige archivo, lo manda a /api/leer y entrega los datos leídos por la IA. */
export function LectorArchivo<T>({ tipo, texto, onLeido }: Props<T>) {
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"" | "leyendo" | string>("");

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setEstado("leyendo");
    try {
      const blob = await comprimirImagen(archivo);
      const form = new FormData();
      form.append("tipo", tipo);
      form.append("archivo", blob, archivo.name);
      const res = await fetch("/api/leer", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo leer");
      if (json.datos?.legible === false) throw new Error("No parece una factura o comprobante legible. Intenta con otra foto.");
      onLeido(json.datos as T, json.link ?? "");
      setEstado("");
    } catch (err) {
      setEstado(err instanceof Error ? err.message : "Error al leer");
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={alElegir} />
      <button type="button" className={`${claseBotonSec} w-full`} disabled={estado === "leyendo"} onClick={() => input.current?.click()}>
        <Icono nombre="camara" className="h-4 w-4 text-turquesa" /> {estado === "leyendo" ? "Leyendo…" : texto}
      </button>
      {estado && estado !== "leyendo" && <p className="mt-1 text-xs text-peligro">{estado}</p>}
    </div>
  );
}
