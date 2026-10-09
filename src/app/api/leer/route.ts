import { manejar } from "@/lib/api";
import { sesionApi } from "@/lib/sesion";
import { leerDocumento, lectorDisponible } from "@/lib/ai/lector";
import { subirADrive } from "@/lib/drive";
import { config } from "@/lib/config";
import { sello } from "@/lib/fechas";
import { NextResponse } from "next/server";

export const maxDuration = 60;
const MAX_BYTES = 8 * 1024 * 1024;

export const POST = manejar(async (req: Request) => {
  const s = await sesionApi();
  if (!lectorDisponible()) {
    return NextResponse.json({ error: "La lectura con IA no está activada (falta ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const form = await req.formData();
  const archivo = form.get("archivo");
  const tipo = form.get("tipo") === "factura" ? "factura" : "pago";
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: "El archivo pesa más de 8 MB" }, { status: 400 });

  const datos = Buffer.from(await archivo.arrayBuffer());
  const [leido, link] = await Promise.all([
    leerDocumento(tipo, { datos, mime: archivo.type }, { categoriasGasto: config.plantilla.categoriasGasto }),
    subirADrive(`${tipo}-${sello()}-${s.nombre}.${archivo.type.split("/")[1] ?? "bin"}`, archivo.type, datos).catch(() => ""),
  ]);
  return { tipo, datos: leido, link };
});
