import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Lectura de facturas y capturas de pago con Claude (visión + salida estructurada).
// Igual que en Bombi: la IA solo PRELLENA el formulario; la persona revisa y confirma.

export const FacturaLeida = z.object({
  proveedor: z.string().describe("Razón social del emisor"),
  rif: z.string().describe("RIF del emisor, ej. J-12345678-9. Vacío si no aparece"),
  nroFactura: z.string().describe("Número de factura o de control. Vacío si no aparece"),
  fecha: z.string().describe("Fecha de emisión en formato AAAA-MM-DD. Vacío si no aparece"),
  moneda: z.enum(["Bs", "USD"]).describe("Moneda en la que están los montos de la factura"),
  items: z.array(
    z.object({
      descripcion: z.string(),
      cantidad: z.number(),
      precioUnitario: z.number().describe("Precio unitario SIN IVA"),
      total: z.number().describe("Total del renglón SIN IVA"),
    }),
  ),
  subtotal: z.number(),
  iva: z.number().describe("Monto de IVA. 0 si es exento o no aparece"),
  igtf: z.number().describe("Monto de IGTF (3%) si aparece, si no 0"),
  total: z.number().describe("Total a pagar de la factura"),
  metodoPago: z.string().describe("Método de pago si aparece (Punto de venta, Pago Móvil, Efectivo...). Vacío si no"),
  conceptoSugerido: z.string().describe("Resumen corto para el registro de gasto, ej. 'Compra de harina y aceite'"),
  categoriaSugerida: z.string().describe("Una de las categorías de gasto dadas"),
  legible: z.boolean().describe("false si la imagen no es una factura o no se puede leer"),
});
export type FacturaLeida = z.infer<typeof FacturaLeida>;

export const PagoLeido = z.object({
  tipo: z.enum(["Pago Móvil", "Transferencia", "Zelle", "Binance", "Punto de venta", "Efectivo", "Otro"]),
  monto: z.number().describe("Monto transferido, sin comisión"),
  moneda: z.enum(["Bs", "USD"]),
  referencia: z.string().describe("Número de referencia / operación completo, sin espacios"),
  bancoOrigen: z.string().describe("Banco desde el que se envió. Vacío si no aparece"),
  bancoDestino: z.string().describe("Banco que recibe. Vacío si no aparece"),
  fecha: z.string().describe("Fecha de la operación en AAAA-MM-DD. Vacío si no aparece"),
  hora: z.string().describe("Hora HH:MM en 24h. Vacío si no aparece"),
  emisor: z.string().describe("Nombre o teléfono del que paga, con el teléfono enmascarado así: 04**-***1234. Vacío si no aparece"),
  concepto: z.string().describe("Concepto o descripción escrito en el pago. Vacío si no hay"),
  legible: z.boolean().describe("false si la imagen no es un comprobante de pago o no se puede leer"),
});
export type PagoLeido = z.infer<typeof PagoLeido>;

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type TipoImagen = (typeof TIPOS_IMAGEN)[number];

export function lectorDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SISTEMA = `Lees documentos de pequeños negocios en Venezuela: facturas fiscales (SENIAT) y comprobantes de pago
(Pago Móvil, transferencias, Zelle, Binance, vouchers de punto de venta).
Reglas:
- Los montos en Bs usan coma decimal y punto de miles ("1.234,56" = 1234.56). Devuelve números normales.
- Si un dato no aparece, deja el texto vacío o 0; nunca lo inventes.
- Copia referencias y RIF exactamente como aparecen.`;

export async function leerDocumento<T extends "factura" | "pago">(
  tipo: T,
  archivo: { datos: Buffer; mime: string },
  contexto: { categoriasGasto?: string[] } = {},
): Promise<T extends "factura" ? FacturaLeida : PagoLeido> {
  const client = new Anthropic();
  const esPdf = archivo.mime === "application/pdf";
  if (!esPdf && !TIPOS_IMAGEN.includes(archivo.mime as TipoImagen)) throw new Error("Formato no soportado. Usa foto (JPG/PNG) o PDF.");

  const adjunto: Anthropic.Beta.BetaContentBlockParam = esPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: archivo.datos.toString("base64") } }
    : { type: "image", source: { type: "base64", media_type: archivo.mime as TipoImagen, data: archivo.datos.toString("base64") } };

  const instruccion =
    tipo === "factura"
      ? `Extrae los datos de esta factura o nota de compra. Categorías de gasto posibles: ${(contexto.categoriasGasto ?? []).join(", ")}.`
      : "Extrae los datos de este comprobante de pago.";

  const respuesta = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Si el modelo declina la solicitud, la API la reintenta con el modelo de respaldo recomendado.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SISTEMA,
    output_config: {
      effort: "low",
      format: betaZodOutputFormat(tipo === "factura" ? FacturaLeida : PagoLeido),
    },
    messages: [{ role: "user", content: [adjunto, { type: "text", text: instruccion }] }],
  });

  if (respuesta.stop_reason === "refusal") throw new Error("No se pudo leer el documento.");
  if (respuesta.stop_reason === "max_tokens") throw new Error("El documento es demasiado largo para leerlo de una vez.");
  if (!respuesta.parsed_output) throw new Error("No se pudo interpretar el documento.");
  return respuesta.parsed_output as T extends "factura" ? FacturaLeida : PagoLeido;
}
