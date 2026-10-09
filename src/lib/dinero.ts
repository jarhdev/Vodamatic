export type Moneda = "Bs" | "USD";

export const redondear = (n: number, dec = 2) => {
  const f = 10 ** dec;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/**
 * Lee números escritos a mano en Sheets o en formularios:
 * "2,50" -> 2.5, "1.234,56" -> 1234.56, "1,234.56" -> 1234.56, "$ 7" -> 7.
 */
export function aNumero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const coma = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  if (coma > -1 && punto > -1) {
    // El separador que aparece de último es el decimal.
    s = coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (coma > -1) {
    s = s.replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte un monto a su equivalente en USD y Bs con la tasa dada.
 * Así se guarda cada movimiento: monto original + ambos equivalentes.
 */
export function equivalentes(monto: number, moneda: Moneda, tasa: number) {
  if (!(tasa > 0)) throw new Error("La tasa debe ser mayor que cero");
  if (moneda === "USD") return { montoUsd: redondear(monto), montoBs: redondear(monto * tasa) };
  return { montoUsd: redondear(monto / tasa), montoBs: redondear(monto) };
}

const fmtBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatoUsd(n: number) {
  return `$${fmtBs.format(n)}`;
}

export function formatoBs(n: number) {
  return `Bs ${fmtBs.format(n)}`;
}

export function formatoTasa(n: number) {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
}
