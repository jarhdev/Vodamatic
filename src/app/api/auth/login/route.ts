import { z } from "zod";
import { manejar } from "@/lib/api";
import { iniciarSesion } from "@/lib/sesion";

export const POST = manejar(async (req: Request) => {
  const { nombre, pin } = z.object({ nombre: z.string().min(1), pin: z.string().min(4) }).parse(await req.json());
  const s = await iniciarSesion(nombre, pin);
  return { nombre: s.nombre, rol: s.rol };
});
