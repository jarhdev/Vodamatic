import { config } from "../config";
import { hoy, marcaTiempo } from "../fechas";
import { aNumero } from "../dinero";
import { getStore, type Tasa } from "../store";

// Misma fuente que usa Bombi: dolarapi publica la tasa oficial del BCV (USD y EUR).
const FUENTE_USD = "https://ve.dolarapi.com/v1/dolares/oficial";
const FUENTE_EUR = "https://ve.dolarapi.com/v1/euros/oficial";

async function consultar(url: string): Promise<number> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`dolarapi ${res.status}`);
  const j = (await res.json()) as { promedio?: number | null; venta?: number | null };
  const v = aNumero(j.promedio ?? j.venta);
  if (!(v > 0)) throw new Error("dolarapi devolvió una tasa vacía");
  return v;
}

let memo: { fecha: string; tasa: Tasa; en: number } | null = null;

/**
 * Tasa del día. Orden de prioridad:
 * 1) tasa cargada hoy en la pestaña Tasas (manual o automática),
 * 2) consulta a dolarapi (se guarda en Tasas),
 * 3) última tasa guardada, 4) variables TASA_*_RESPALDO.
 */
export async function tasaDelDia(): Promise<Tasa> {
  const fecha = hoy();
  if (memo && memo.fecha === fecha && Date.now() - memo.en < 5 * 60_000) return memo.tasa;

  const store = getStore();
  const guardadas = (await store.listar("tasas")).filter((t) => t.usd > 0);
  const deHoy = guardadas.filter((t) => t.fecha === fecha);
  // Si hay una manual de hoy, manda sobre la automática.
  let tasa = deHoy.find((t) => t.fuente === "manual") ?? deHoy.at(-1);

  if (!tasa) {
    try {
      const [usd, eur] = await Promise.all([consultar(FUENTE_USD), consultar(FUENTE_EUR).catch(() => 0)]);
      tasa = { fecha, usd, eur, fuente: "dolarapi (BCV)", consultada: marcaTiempo() };
      await store.agregar("tasas", [tasa]);
    } catch {
      tasa = guardadas.sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1) ?? {
        fecha, usd: aNumero(process.env.TASA_USD_RESPALDO), eur: aNumero(process.env.TASA_EUR_RESPALDO), fuente: "respaldo", consultada: marcaTiempo(),
      };
    }
  }
  memo = { fecha, tasa, en: Date.now() };
  return tasa;
}

/** La tasa con la que este negocio pasa USD a Bs (BCV dólar o BCV euro, según TASA_REFERENCIA). */
export async function tasaNegocio(): Promise<{ valor: number; tasa: Tasa }> {
  const tasa = await tasaDelDia();
  const valor = config.tasaReferencia === "eur" && tasa.eur > 0 ? tasa.eur : tasa.usd;
  if (!(valor > 0)) throw new Error("No hay tasa disponible. Cárgala manualmente en la sección Tasa.");
  return { valor, tasa };
}

export async function guardarTasaManual(usd: number, eur: number): Promise<Tasa> {
  const tasa: Tasa = { fecha: hoy(), usd, eur, fuente: "manual", consultada: marcaTiempo() };
  await getStore().agregar("tasas", [tasa]);
  memo = null;
  return tasa;
}
