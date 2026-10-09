import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoriaStore } from "@/lib/store/memoria";
import { setStore } from "@/lib/store";
import { hoy } from "@/lib/fechas";
import { hashPin } from "@/lib/pin";

// La IA se simula: devuelve un capture de Pago Móvil o una factura.
vi.mock("@/lib/ai/lector", () => ({
  lectorDisponible: () => true,
  leerDocumento: vi.fn(async (tipo: string) =>
    tipo === "pago"
      ? { tipo: "Pago Móvil", monto: 1749.46, moneda: "Bs", referencia: "062762468303", bancoOrigen: "Banesco", bancoDestino: "", fecha: "", hora: "", emisor: "04**-***0771", concepto: "", legible: true }
      : { proveedor: "Comercial Gran Fortuna", rif: "J-1", nroFactura: "000123", fecha: "", moneda: "Bs", items: [{ descripcion: "HARINA DE TRIGO 1KG", cantidad: 10, precioUnitario: 800, total: 8000 }], subtotal: 8000, iva: 1280, igtf: 0, total: 9280, metodoPago: "Punto de venta", conceptoSugerido: "Compra de harina", categoriaSugerida: "Insumos", legible: true },
  ),
}));
// next/headers no existe fuera de Next; el bot no lo usa, pero sesion.ts lo importa.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }), headers: async () => new Headers() }));

const { manejarUpdate } = await import("@/lib/telegram/bot");

let store: MemoriaStore;
let enviados: { metodo: string; cuerpo: Record<string, unknown> }[];

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  enviados = [];
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/file/bot")) return new Response(new Uint8Array([1, 2, 3]));
    const metodo = u.split("/").pop()!;
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : {};
    enviados.push({ metodo, cuerpo });
    const result = metodo === "getFile" ? { file_path: "photos/x.jpg" } : { message_id: 99 };
    return new Response(JSON.stringify({ ok: true, result }));
  }) as typeof fetch;
  const sal = "s";
  store = new MemoriaStore({
    productos: [{ id: "harina", nombre: "Harina de trigo 1kg", categoria: "Insumos", unidad: "kg", precioUsd: 0, costoUsd: 1, stockMinimo: 2, controlaStock: "sí", activo: "sí" }],
    tasas: [{ fecha: hoy(), usd: 874.73, eur: 0, fuente: "test", consultada: "" }],
    usuarios: [{ id: "u1", nombre: "Jose", rol: "admin", pinHash: hashPin("4321", sal), pinSal: sal, estado: "activo", intentosFallidos: 0, bloqueadoHasta: "", creado: "", telegramId: "" }],
  });
  setStore(store);
});

const msg = (texto: string, extra = {}) => ({ update_id: 1, message: { message_id: 10, chat: { id: 555, type: "private" }, from: { id: 555 }, text: texto, ...extra } });
const boton = (data: string) => ({ update_id: 2, callback_query: { id: "cb", from: { id: 555 }, message: { message_id: 99, chat: { id: 555, type: "private" } }, data } });
const ultimoTexto = () => String([...enviados].reverse().find((e) => e.cuerpo.text)?.cuerpo.text ?? "");

describe("bot de Telegram", () => {
  it("pide vincular a un chat desconocido", async () => {
    await manejarUpdate(msg("/resumen"));
    expect(ultimoTexto()).toContain("/vincular");
  });

  it("vincula con nombre y PIN, y borra el mensaje del PIN", async () => {
    await manejarUpdate(msg("/vincular jose 0000"));
    expect(ultimoTexto()).toContain("incorrecto");
    await manejarUpdate(msg("/vincular Jose 4321"));
    expect(enviados.filter((e) => e.metodo === "deleteMessage")).toHaveLength(2);
    expect(store.datos.usuarios[0].telegramId).toBe("555");
    expect(ultimoTexto()).toContain("vinculado");
  });

  it("foto de capture → leer → ✅ registra la venta una sola vez", async () => {
    store.datos.usuarios[0].telegramId = "555";
    await manejarUpdate(msg("", { text: undefined, caption: "2 tortas", photo: [{ file_id: "chica" }, { file_id: "grande" }] }));
    const p = store.datos.pendientes[0];
    expect(JSON.parse(p.archivo).fileId).toBe("grande");
    await manejarUpdate(boton(`leer:pago:${p.id}`));
    expect(store.datos.pendientes[0].estado).toBe("leido");
    expect(ultimoTexto()).toContain("062762468303");
    await manejarUpdate(boton(`ok:${p.id}`));
    await manejarUpdate(boton(`ok:${p.id}`)); // Telegram reintenta
    expect(store.datos.ventas).toHaveLength(1);
    const v = store.datos.ventas[0];
    expect(v.totalUsd).toBe(2);
    expect(v.items).toBe("1x 2 tortas");
    expect(v.origen).toBe("telegram");
    expect(ultimoTexto()).toContain("Venta registrada");
  });

  it("foto de factura → gasto con IVA repartido y entrada al inventario", async () => {
    store.datos.usuarios[0].telegramId = "555";
    await manejarUpdate(msg("", { text: undefined, photo: [{ file_id: "f" }] }));
    const p = store.datos.pendientes[0];
    await manejarUpdate(boton(`leer:factura:${p.id}`));
    await manejarUpdate(boton(`ok:${p.id}`));
    expect(store.datos.gastos).toHaveLength(1);
    expect(store.datos.gastos[0].montoBs).toBe(9280);
    const entrada = store.datos.movimientos.find((m) => m.productoId === "harina");
    expect(entrada?.cantidad).toBe(10);
    expect(entrada?.costoUnitUsd).toBeCloseTo(928 / 874.73, 3);
    expect(ultimoTexto()).toContain("Al inventario");
  });

  it("descartar no registra nada", async () => {
    store.datos.usuarios[0].telegramId = "555";
    await manejarUpdate(msg("", { text: undefined, photo: [{ file_id: "f" }] }));
    await manejarUpdate(boton(`no:${store.datos.pendientes[0].id}`));
    expect(store.datos.pendientes[0].estado).toBe("descartado");
    expect(store.datos.ventas).toHaveLength(0);
  });

  it("/stock avisa lo que hay que reponer", async () => {
    store.datos.usuarios[0].telegramId = "555";
    await manejarUpdate(msg("/stock"));
    expect(ultimoTexto()).toContain("Harina de trigo 1kg");
  });
});
