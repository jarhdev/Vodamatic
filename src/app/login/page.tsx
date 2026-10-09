import { redirect } from "next/navigation";
import { config, modoDemo } from "@/lib/config";
import { sesionActual } from "@/lib/sesion";
import { LoginForm } from "./LoginForm";

export default async function Login() {
  if (await sesionActual()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{config.negocio}</h1>
      <p className="mb-6 text-sm text-tinta-2">Entra con tu nombre y PIN.</p>
      <LoginForm />
      {modoDemo() && (
        <p className="mt-6 rounded-xl bg-aviso-suave p-3 text-sm text-aviso">
          Modo demo: usuario <b>Demo</b>, PIN <b>1234</b>. Los datos son de ejemplo y se reinician.
        </p>
      )}
    </main>
  );
}
