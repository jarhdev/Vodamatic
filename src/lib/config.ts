import { RUBROS, type Rubro } from "./rubros";

const rubro = (process.env.NEGOCIO_RUBRO ?? "general") as Rubro;

export const config = {
  negocio: process.env.NEGOCIO_NOMBRE ?? "Mi Negocio",
  rubro: rubro in RUBROS ? rubro : ("general" as Rubro),
  get plantilla() {
    return RUBROS[this.rubro];
  },
  /** Qué tasa BCV usa el negocio para pasar sus precios USD a Bs. */
  tasaReferencia: (process.env.TASA_REFERENCIA === "eur" ? "eur" : "usd") as "usd" | "eur",
  zonaHoraria: "America/Caracas",
};

/** Sin credenciales de Google la app corre con datos de ejemplo en memoria. */
export function modoDemo(): boolean {
  return !(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}
