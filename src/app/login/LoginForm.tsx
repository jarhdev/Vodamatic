"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claseBoton, claseInput, Campo } from "@/components/ui";
import { enviar } from "@/components/cliente";

export function LoginForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setOcupado(true);
        try {
          await enviar("/api/auth/login", { nombre, pin });
          router.replace("/");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error");
          setOcupado(false);
        }
      }}
    >
      <Campo etiqueta="Nombre"><input className={claseInput} autoComplete="username" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
      <Campo etiqueta="PIN"><input className={`${claseInput} num tracking-widest`} type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} /></Campo>
      {error && <p className="text-sm text-peligro">{error}</p>}
      <button className={`${claseBoton} w-full`} disabled={ocupado || !nombre || pin.length < 4}>{ocupado ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
