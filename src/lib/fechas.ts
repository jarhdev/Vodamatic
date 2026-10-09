// Todas las fechas se registran en hora de Venezuela, sin importar dónde corra el servidor.
const TZ = "America/Caracas";

function partes(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") === "24" ? "00" : get("hour"), min: get("minute"), s: get("second") };
}

/** "2026-10-09" */
export function hoy(d = new Date()): string {
  const p = partes(d);
  return `${p.y}-${p.m}-${p.d}`;
}

/** "14:05" */
export function horaActual(d = new Date()): string {
  const p = partes(d);
  return `${p.h}:${p.min}`;
}

/** "2026-10-09 14:05" */
export function marcaTiempo(d = new Date()): string {
  return `${hoy(d)} ${horaActual(d)}`;
}

/** Compacto para IDs: "261009-140512" */
export function sello(d = new Date()): string {
  const p = partes(d);
  return `${p.y.slice(2)}${p.m}${p.d}-${p.h}${p.min}${p.s}`;
}

/** Lunes de la semana de la fecha ISO dada. */
export function inicioSemana(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dia = (dt.getUTCDay() + 6) % 7; // lunes = 0
  dt.setUTCDate(dt.getUTCDate() - dia);
  return dt.toISOString().slice(0, 10);
}

export function inicioMes(fechaIso: string): string {
  return `${fechaIso.slice(0, 7)}-01`;
}

export function sumarDias(fechaIso: string, dias: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Acepta "2026-10-09", "09/10/2026" o un número de serie de Sheets y devuelve ISO. */
export function normalizarFecha(v: unknown): string {
  if (typeof v === "number") {
    // Serial de Google Sheets (días desde 1899-12-30)
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return dt.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s.slice(0, 10);
}
