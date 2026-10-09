import { hoy, inicioSemana, sumarDias } from "../fechas";
import { hashPin } from "../pin";
import { redondear } from "../dinero";
import type { DetalleVenta, Gasto, Movimiento, Producto, Tasa, Usuario, Venta } from "./esquema";

/** Datos de ejemplo (una cafetería) para enseñar la app sin conectar nada. Usuario: Demo / PIN 1234. */
export function datosDemo() {
  const f0 = hoy();
  const tasaUsd = 874.73;
  const tasaEur = 1021.4;

  const productos: Producto[] = [
    ["cafe-guayoyo", "Guayoyo", "Bebidas calientes", "taza", 1.2, 0.35, 0, "no"],
    ["cafe-marron", "Marrón", "Bebidas calientes", "taza", 1.8, 0.55, 0, "no"],
    ["capuchino", "Capuchino", "Bebidas calientes", "taza", 2.5, 0.8, 0, "no"],
    ["jugo-naranja", "Jugo de naranja", "Bebidas frías", "vaso", 2.0, 0.7, 0, "no"],
    ["cachito-jamon", "Cachito de jamón", "Comida", "und", 1.5, 0.6, 15, "sí"],
    ["pastelito-queso", "Pastelito de queso", "Comida", "und", 1.0, 0.35, 20, "sí"],
    ["torta-chocolate", "Torta de chocolate (porción)", "Postres", "porción", 3.0, 1.1, 6, "sí"],
    ["cafe-grano-1kg", "Café en grano 1kg", "Insumos", "kg", 0, 9.5, 3, "sí"],
    ["leche-1l", "Leche completa 1L", "Insumos", "l", 0, 1.6, 8, "sí"],
    ["vaso-12oz", "Vaso 12oz con tapa", "Insumos", "und", 0, 0.12, 100, "sí"],
  ].map(([id, nombre, categoria, unidad, precioUsd, costoUsd, stockMinimo, controlaStock]) => ({
    id: id as string, nombre: nombre as string, categoria: categoria as string, unidad: unidad as string,
    precioUsd: precioUsd as number, costoUsd: costoUsd as number, stockMinimo: stockMinimo as number,
    controlaStock: controlaStock as string, activo: "sí",
  }));

  const stockInicial: Record<string, number> = {
    "cachito-jamon": 70, "pastelito-queso": 120, "torta-chocolate": 75, "cafe-grano-1kg": 4, "leche-1l": 6, "vaso-12oz": 250,
  };
  const movimientos: Movimiento[] = Object.entries(stockInicial).map(([pid, cant], i) => ({
    id: `M-demo-ini-${i}`, fecha: sumarDias(f0, -14), hora: "08:00", productoId: pid,
    producto: productos.find((p) => p.id === pid)!.nombre, tipo: "entrada", cantidad: cant,
    costoUnitUsd: productos.find((p) => p.id === pid)!.costoUsd, origen: "manual", referencia: "", nota: "Inventario inicial",
    registradoPor: "Demo", anulado: "",
  }));

  const ventas: Venta[] = [];
  const detalleVentas: DetalleVenta[] = [];
  const metodos = ["Pago Móvil", "Pago Móvil", "Punto de venta", "Efectivo USD", "Transferencia", "Zelle"];
  const bancos = ["Banesco", "Mercantil", "BBVA Provincial", "Banco de Venezuela"];
  let n = 0;
  // Ventas de las últimas dos semanas, determinísticas para que el demo se vea igual siempre.
  for (let d = 13; d >= 0; d--) {
    const fecha = sumarDias(f0, -d);
    const porDia = 4 + ((d * 7) % 5);
    for (let k = 0; k < porDia; k++) {
      n++;
      const vendibles = productos.filter((p) => p.precioUsd > 0);
      const a = vendibles[(n * 3) % vendibles.length];
      const b = vendibles[(n * 5 + 1) % vendibles.length];
      const lineas = a.id === b.id ? [{ p: a, c: 2 }] : [{ p: a, c: 1 }, { p: b, c: 1 + (n % 2) }];
      const totalUsd = redondear(lineas.reduce((s, l) => s + l.p.precioUsd * l.c, 0));
      const metodo = metodos[n % metodos.length];
      const enUsd = metodo === "Efectivo USD" || metodo === "Zelle";
      const pendiente = n % 17 === 0;
      const id = `V-demo-${String(n).padStart(3, "0")}`;
      ventas.push({
        id, fecha, hora: `${String(7 + (k % 11)).padStart(2, "0")}:${String((n * 13) % 60).padStart(2, "0")}`,
        items: lineas.map((l) => `${l.c}x ${l.p.nombre}`).join(", "), cantidad: lineas.reduce((s, l) => s + l.c, 0),
        totalUsd, estado: pendiente ? "pendiente" : "pagada", moneda: enUsd ? "USD" : "Bs",
        monto: pendiente ? 0 : enUsd ? totalUsd : redondear(totalUsd * tasaUsd), tasa: tasaUsd,
        montoUsd: totalUsd, montoBs: redondear(totalUsd * tasaUsd), metodo: pendiente ? "" : metodo,
        banco: pendiente || enUsd ? "" : bancos[n % bancos.length], referencia: pendiente || enUsd ? "" : String(10000000 + n * 7919),
        cliente: pendiente ? ["María José", "Sr. Pedro (oficina)", "Kimberly"][n % 3] : "", fechaEsperada: pendiente ? sumarDias(fecha, 3) : "",
        fechaPago: "", registradoPor: n % 3 ? "Demo" : "Laura", origen: "webapp", linkCapture: "", anulado: "", requestId: "",
      });
      for (const l of lineas) {
        detalleVentas.push({
          ventaId: id, fecha, semana: inicioSemana(fecha), productoId: l.p.id, producto: l.p.nombre, cantidad: l.c,
          precioUsd: l.p.precioUsd, subtotalUsd: redondear(l.p.precioUsd * l.c), anulado: "",
        });
        if (l.p.controlaStock === "sí") {
          movimientos.push({
            id: `M-${id}-${l.p.id}`, fecha, hora: "12:00", productoId: l.p.id, producto: l.p.nombre, tipo: "salida",
            cantidad: -l.c, costoUnitUsd: l.p.costoUsd, origen: "venta", referencia: id, nota: "", registradoPor: "Demo", anulado: "",
          });
        }
      }
    }
  }

  const gastos: Gasto[] = [
    [-12, "Compra de café en grano y leche", "Insumos", "Distribuidora El Grano, C.A.", 46.5],
    [-9, "Pago de luz (Corpoelec)", "Servicios", "Corpoelec", 18],
    [-6, "Harina, jamón y queso para cachitos", "Insumos", "Comercial Gran Fortuna 868, C.A.", 38.2],
    [-3, "Vasos y servilletas", "Empaques", "Plásticos del Centro", 22.75],
    [-1, "Gas", "Servicios", "Gas Comunal", 6],
  ].map(([d, concepto, categoria, proveedor, usd], i) => ({
    id: `G-demo-${i + 1}`, fecha: sumarDias(f0, d as number), hora: "10:30", concepto: concepto as string, categoria: categoria as string,
    proveedor: proveedor as string, rif: "", nroFactura: "", moneda: "Bs", monto: redondear((usd as number) * tasaUsd), tasa: tasaUsd,
    montoUsd: usd as number, montoBs: redondear((usd as number) * tasaUsd), metodo: "Punto de venta", referencia: "",
    registradoPor: "Demo", origen: "webapp", linkCapture: "", anulado: "", requestId: "",
  }));

  const tasas: Tasa[] = [{ fecha: f0, usd: tasaUsd, eur: tasaEur, fuente: "demo", consultada: `${f0} 08:00` }];

  const sal = "demo0000demo0000";
  const usuarios: Usuario[] = [
    { id: "u1", nombre: "Demo", rol: "admin", pinHash: hashPin("1234", sal), pinSal: sal, estado: "activo", intentosFallidos: 0, bloqueadoHasta: "", creado: f0 },
  ];

  return { productos, ventas, detalleVentas, gastos, detalleGastos: [], movimientos, tasas, usuarios };
}
