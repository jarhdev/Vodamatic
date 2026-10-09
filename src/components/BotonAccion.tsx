"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./cliente";

/** Botón pequeño que confirma, hace POST y refresca la página (ej. Anular). */
export function BotonAccion({ url, texto, confirmar, peligro = true }: { url: string; texto: string; confirmar?: string; peligro?: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      disabled={ocupado}
      className={`text-xs font-medium ${peligro ? "text-peligro" : "text-acento"} disabled:opacity-50`}
      onClick={async () => {
        if (confirmar && !window.confirm(confirmar)) return;
        setOcupado(true);
        try {
          await enviar(url);
          router.refresh();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Error");
        } finally {
          setOcupado(false);
        }
      }}
    >
      {ocupado ? "…" : texto}
    </button>
  );
}
