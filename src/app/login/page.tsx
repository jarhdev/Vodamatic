import { redirect } from "next/navigation";
import { config, modoDemo } from "@/lib/config";
import { sesionActual } from "@/lib/sesion";
import { Marca } from "@/components/Icono";
import { LoginForm } from "./LoginForm";

export default async function Login() {
  if (await sesionActual()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <Marca className="h-12 w-12" />
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-tinta-3">Vodamatic</div>
          <h1 className="text-2xl font-semibold tracking-tight">{config.negocio}</h1>
        </div>
      </div>
      <div className="borde-degradado rounded-2xl p-5 shadow-[0_20px_60px_-20px_rgba(59,130,246,0.35)]">
        <p className="mb-4 text-sm text-tinta-2">Entra con tu nombre y PIN.</p>
        <LoginForm />
      </div>
      {modoDemo() && (
        <p className="mt-5 rounded-xl border border-aviso/20 bg-aviso-suave p-3 text-sm text-aviso">
          Modo demo: usuario <b>Demo</b>, PIN <b>1234</b>. Los datos son de ejemplo.
        </p>
      )}
    </main>
  );
}
