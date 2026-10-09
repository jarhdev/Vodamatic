import { modoDemo } from "../config";
import type { Store } from "./esquema";
import { MemoriaStore } from "./memoria";
import { SheetsStore } from "./sheets";
import { datosDemo } from "./demo";

export * from "./esquema";

const g = globalThis as unknown as { __store?: Store };

export function getStore(): Store {
  if (!g.__store) {
    g.__store = modoDemo()
      ? new MemoriaStore(datosDemo())
      : new SheetsStore(process.env.GOOGLE_SHEET_ID!, process.env.GOOGLE_CLIENT_EMAIL!, process.env.GOOGLE_PRIVATE_KEY!);
  }
  return g.__store;
}

/** Solo para tests. */
export function setStore(s: Store) {
  g.__store = s;
}
