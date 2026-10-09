import { beforeEach, describe, expect, it } from "vitest";
import { MemoriaStore } from "@/lib/store/memoria";
import { setStore } from "@/lib/store";
import { hoy } from "@/lib/fechas";
import { registrarVenta, registrarCobro, anularVenta } from "@/lib/services/ventas";
import { registrarGasto } from "@/lib/services/gastos";
import { registrarMovimiento, stockActual } from "@/lib/services/inventario";
import { desdeCeldas, haciaCeldas, encabezadosDe } from "@/lib/store/conversion";

let store: MemoriaStore;

beforeEach(() => {
  store = new MemoriaStore({
    productos: [
      { id: "cachito", nombre: "Cachito de jamón", categoria: "Comida", unidad: "und", precioUsd: 1.5, costoUsd: 0.6, stockMinimo: 5, controlaStock: "sí", activo: "sí" },
      { id: "cafe", nombre: "Guayoyo", categoria: "Bebidas", unidad: "taza", precioUsd: 1.2, costoUsd: 0.3, stockMinimo: 0, controlaStock: "no", activo: "sí" },
      { id: "harina", nombre: "Harina de trigo 1kg", categoria: "Insumos", unidad: "kg", precioUsd: 0, costoUsd: 1.1, stockMinimo: 2, controlaStock: "sí", activo: "sí" },
    ],
    tasas: [{ fecha: hoy(), usd: 800, eur: 900, fuente: "test", consultada: "" }],
  });
  setStore(store);
});

describe("ventas e inventario", () => {
  it("una venta pagada en Bs guarda equivalentes y descuenta stock", async () => {
    await registrarMovimiento({ productoId: "cachito", tipo: "entrada", cantidad: 10 }, "test");
    const v = await registrarVenta({
      items: [
        { productoId: "cachito", descripcion: "Cachito de jamón", cantidad: 3, precioUsd: 1.5 },
        { productoId: "cafe", descripcion: "Guayoyo", cantidad: 2, precioUsd: 1.2 },
      ],
      pago: { moneda: "Bs", metodo: "Pago Móvil", banco: "Banesco", referencia: "123" },
    }, "test");
    expect(v.totalUsd).toBe(6.9);
    expect(v.montoBs).toBe(5520);
    expect(v.montoUsd).toBe(6.9);
    expect(v.estado).toBe("pagada");
    const stock = await stockActual();
    expect(stock.find((l) => l.producto.id === "cachito")?.stock).toBe(7);
    expect(store.datos.detalleVentas).toHaveLength(2);
    expect(store.pestañas.get("Stock")?.[1]).toContain(7);
  });

  it("no duplica una venta reenviada con el mismo requestId", async () => {
    const base = { items: [{ descripcion: "Otro", cantidad: 1, precioUsd: 2 }], pago: { moneda: "USD" as const }, requestId: "abc" };
    const a = await registrarVenta(base, "test");
    const b = await registrarVenta(base, "test");
    expect(a.id).toBe(b.id);
    expect(store.datos.ventas).toHaveLength(1);
  });

  it("venta por cobrar se cobra después con la tasa del día", async () => {
    const v = await registrarVenta({ items: [{ descripcion: "Pedido", cantidad: 1, precioUsd: 10 }], porCobrar: true, cliente: "María" }, "test");
    expect(v.estado).toBe("pendiente");
    await registrarCobro(v.id, { moneda: "Bs", metodo: "Pago Móvil", referencia: "999" });
    const cobrada = store.datos.ventas[0];
    expect(cobrada.estado).toBe("pagada");
    expect(cobrada.montoBs).toBe(8000);
    await expect(registrarCobro(v.id, { moneda: "Bs" })).rejects.toThrow();
  });

  it("anular una venta devuelve el inventario", async () => {
    await registrarMovimiento({ productoId: "cachito", tipo: "entrada", cantidad: 4 }, "test");
    const v = await registrarVenta({ items: [{ productoId: "cachito", descripcion: "Cachito", cantidad: 4, precioUsd: 1.5 }], pago: { moneda: "USD" } }, "test");
    expect((await stockActual()).find((l) => l.producto.id === "cachito")?.estado).toBe("Agotado");
    await anularVenta(v.id, "admin");
    expect((await stockActual()).find((l) => l.producto.id === "cachito")?.stock).toBe(4);
  });

  it("conteo físico ajusta al número contado", async () => {
    await registrarMovimiento({ productoId: "harina", tipo: "entrada", cantidad: 10 }, "test");
    const m = await registrarMovimiento({ productoId: "harina", tipo: "conteo", cantidad: 7 }, "test");
    expect(m?.cantidad).toBe(-3);
    expect((await stockActual()).find((l) => l.producto.id === "harina")?.stock).toBe(7);
  });
});

describe("gastos", () => {
  it("una factura con renglones suma inventario y actualiza el costo", async () => {
    const g = await registrarGasto({
      concepto: "Compra de harina", categoria: "Insumos", proveedor: "Gran Fortuna", moneda: "Bs", monto: 8000,
      items: [{ productoId: "harina", descripcion: "Harina de trigo", cantidad: 5, costoUnit: 1600 }],
    }, "test");
    expect(g.montoUsd).toBe(10);
    expect((await stockActual()).find((l) => l.producto.id === "harina")?.stock).toBe(5);
    expect(store.datos.productos.find((p) => p.id === "harina")?.costoUsd).toBe(2);
  });
});

describe("conversión de filas del Sheet", () => {
  it("lee por nombre de encabezado aunque las columnas estén en otro orden", () => {
    const encabezados = ["Precio USD", "ID", "Nombre", "Columna del dueño"];
    const p = desdeCeldas("productos", encabezados, ["2,50", "ny-1", "NY Cookie", "x"]);
    expect(p.precioUsd).toBe(2.5);
    expect(p.id).toBe("ny-1");
    // Al escribir respeta el orden y no pisa la columna propia del dueño
    expect(haciaCeldas("productos", encabezados, { ...p, precioUsd: 3 }, ["2,50", "ny-1", "NY Cookie", "x"])).toEqual([3, "ny-1", "NY Cookie", "x"]);
  });
  it("todas las tablas tienen encabezados únicos", () => {
    for (const t of ["productos", "ventas", "gastos", "movimientos"] as const) {
      const h = encabezadosDe(t);
      expect(new Set(h).size).toBe(h.length);
    }
  });
});
