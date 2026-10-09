import { JWT } from "google-auth-library";
import { TABLAS, type Celda, type Filas, type Store, type Tabla } from "./esquema";
import { desdeCeldas, encabezadosDe, haciaCeldas } from "./conversion";

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const CACHE_MS = 10_000;

export function letraColumna(n: number): string {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

const rango = (pestaña: string, a1 = "") => encodeURIComponent(`'${pestaña.replace(/'/g, "''")}'${a1 ? "!" + a1 : ""}`);

interface Lectura {
  encabezados: string[];
  filas: unknown[][]; // sin la fila de encabezados
  en: number;
}

/**
 * Store sobre la API REST de Google Sheets con una cuenta de servicio.
 * Cada negocio tiene su propio Spreadsheet compartido con el correo de la cuenta de servicio.
 */
export class SheetsStore implements Store {
  private jwt: JWT;
  private cache = new Map<string, Lectura>();

  constructor(private sheetId: string, email: string, privateKey: string) {
    this.jwt = new JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
    });
  }

  async token(): Promise<string> {
    const { token } = await this.jwt.getAccessToken();
    if (!token) throw new Error("No se pudo obtener token de Google");
    return token;
  }

  private async llamar(ruta: string, init: RequestInit = {}) {
    const res = await fetch(`${API}/${this.sheetId}${ruta}`, {
      ...init,
      headers: { Authorization: `Bearer ${await this.token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private async leer(pestaña: string): Promise<Lectura> {
    const c = this.cache.get(pestaña);
    if (c && Date.now() - c.en < CACHE_MS) return c;
    const data = await this.llamar(`/values/${rango(pestaña)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`);
    const valores: unknown[][] = data.values ?? [];
    const lectura = { encabezados: (valores[0] ?? []).map(String), filas: valores.slice(1), en: Date.now() };
    this.cache.set(pestaña, lectura);
    return lectura;
  }

  async listar<T extends Tabla>(tabla: T): Promise<Filas[T][]> {
    const { encabezados, filas } = await this.leer(TABLAS[tabla].pestaña);
    // Ignora filas vacías o de notas (primera columna vacía).
    return filas.filter((f) => f[0] !== undefined && f[0] !== "").map((f) => desdeCeldas(tabla, encabezados, f));
  }

  async agregar<T extends Tabla>(tabla: T, filas: Filas[T][]): Promise<void> {
    if (!filas.length) return;
    const pestaña = TABLAS[tabla].pestaña;
    const { encabezados } = await this.leer(pestaña);
    const valores = filas.map((f) => haciaCeldas(tabla, encabezados, f));
    await this.llamar(`/values/${rango(pestaña, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: JSON.stringify({ values: valores }),
    });
    this.cache.delete(pestaña);
  }

  async actualizar<T extends Tabla>(tabla: T, donde: (f: Filas[T]) => boolean, cambios: Partial<Filas[T]>): Promise<number> {
    const pestaña = TABLAS[tabla].pestaña;
    this.cache.delete(pestaña); // leer fresco para no pisar cambios recientes
    const { encabezados, filas } = await this.leer(pestaña);
    const data: { range: string; values: Celda[][] }[] = [];
    filas.forEach((crudo, i) => {
      if (crudo[0] === undefined || crudo[0] === "") return;
      const fila = desdeCeldas(tabla, encabezados, crudo);
      if (!donde(fila)) return;
      const n = i + 2; // +1 por encabezado, +1 porque Sheets cuenta desde 1
      data.push({
        range: `'${pestaña}'!A${n}:${letraColumna(encabezados.length)}${n}`,
        values: [haciaCeldas(tabla, encabezados, { ...fila, ...cambios }, crudo)],
      });
    });
    if (data.length) {
      await this.llamar(`/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
      this.cache.delete(pestaña);
    }
    return data.length;
  }

  /** Escribe fórmulas (USER_ENTERED) desde A1. Lo usa el setup para las pestañas calculadas. */
  async escribirFormulas(pestaña: string, filas: (Celda | null)[][]): Promise<void> {
    await this.llamar(`/values/${rango(pestaña)}:clear`, { method: "POST", body: "{}" });
    await this.llamar(`/values/${rango(pestaña, "A1")}?valueInputOption=USER_ENTERED`, { method: "PUT", body: JSON.stringify({ values: filas }) });
  }

  /** Crea las pestañas que falten y escribe los encabezados. Lo usa scripts/setup-sheet.ts. */
  async prepararHoja(pestañasCalculadas: string[]): Promise<string[]> {
    const meta = await this.llamar(`?fields=sheets.properties.title`);
    const existentes = new Set<string>((meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title));
    const creadas: string[] = [];
    // Hora de Venezuela para que TODAY() en las fórmulas cuadre con las fechas de la app.
    await this.llamar(`:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ updateSpreadsheetProperties: { properties: { timeZone: "America/Caracas" }, fields: "timeZone" } }] }),
    });
    const requeridas = [...pestañasCalculadas, ...Object.values(TABLAS).map((t) => t.pestaña)];
    const faltan = requeridas.filter((p) => !existentes.has(p));
    if (faltan.length) {
      await this.llamar(`:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({ requests: faltan.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
      });
      creadas.push(...faltan);
    }
    for (const tabla of Object.keys(TABLAS) as Tabla[]) {
      const pestaña = TABLAS[tabla].pestaña;
      this.cache.delete(pestaña);
      const { encabezados } = await this.leer(pestaña);
      const faltantes = encabezadosDe(tabla).filter((h) => !encabezados.includes(h));
      if (faltantes.length) {
        const todos = [...encabezados, ...faltantes];
        await this.llamar(`/values/${rango(pestaña, "A1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [todos] }) });
      }
      this.cache.delete(pestaña);
    }
    return creadas;
  }
}
