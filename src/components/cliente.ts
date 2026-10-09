"use client";

/** POST JSON a la API y devuelve la respuesta; lanza Error con el mensaje del servidor. */
export async function enviar<T = unknown>(url: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json as T;
}

export function idSolicitud() {
  return crypto.randomUUID();
}

/** Lee "1.234,56" o "1234.56" como número. */
export function num(v: string): number {
  const s = v.trim();
  if (!s) return 0;
  const coma = s.lastIndexOf(","), punto = s.lastIndexOf(".");
  const limpio = coma > -1 && punto > -1
    ? (coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""))
    : s.replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Reduce fotos grandes del teléfono antes de subirlas (más rápido y barato de leer). */
export async function comprimirImagen(archivo: File, maxLado = 1800): Promise<Blob> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo;
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  if (escala === 1 && archivo.size < 1.5 * 1024 * 1024) return archivo;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b ?? archivo), "image/jpeg", 0.85));
}
