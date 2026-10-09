import { manejar } from "@/lib/api";
import { cerrarSesion } from "@/lib/sesion";

export const POST = manejar(async () => {
  await cerrarSesion();
});
