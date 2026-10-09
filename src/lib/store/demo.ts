import { hoy, inicioSemana, sumarDias } from "../fechas";
import { hashPin } from "../pin";
import { redondear } from "../dinero";
import type { Rubro } from "../rubros";
import type { DetalleVenta, Gasto, Movimiento, Producto, Tasa, Usuario, Venta } from "./esquema";

// Datos ficticios para enseñar la app sin conectar nada (y para llenar las hojas demo).
// Usuario: Demo / PIN 1234.

type FilaProducto = [id: string, nombre: string, categoria: string, unidad: string, precio: number, costo: number, minimo: number, stock: string, inicial?: number];

const CATALOGOS: Partial<Record<Rubro, FilaProducto[]>> = {
  cafeteria: [
    ["cafe-guayoyo", "Guayoyo", "Bebidas calientes", "taza", 1.2, 0.35, 0, "no"],
    ["cafe-marron", "Marrón", "Bebidas calientes", "taza", 1.8, 0.55, 0, "no"],
    ["capuchino", "Capuchino", "Bebidas calientes", "taza", 2.5, 0.8, 0, "no"],
    ["jugo-naranja", "Jugo de naranja", "Bebidas frías", "vaso", 2.0, 0.7, 0, "no"],
    ["cachito-jamon", "Cachito de jamón", "Comida", "und", 1.5, 0.6, 15, "sí", 90],
    ["pastelito-queso", "Pastelito de queso", "Comida", "und", 1.0, 0.35, 20, "sí", 140],
    ["empanada-carne", "Empanada de carne mechada", "Comida", "und", 1.8, 0.7, 15, "sí", 80],
    ["torta-chocolate", "Torta de chocolate (porción)", "Postres", "porción", 3.0, 1.1, 6, "sí", 60],
    ["quesillo", "Quesillo (porción)", "Postres", "porción", 2.5, 0.8, 6, "sí", 40],
    ["cafe-grano-1kg", "Café en grano 1kg", "Insumos", "kg", 0, 9.5, 3, "sí", 6],
    ["leche-1l", "Leche completa 1L", "Insumos", "l", 0, 1.6, 8, "sí", 20],
    ["vaso-12oz", "Vaso 12oz con tapa", "Insumos", "und", 0, 0.12, 100, "sí", 400],
  ],
  bodegon: [
    ["ron-santa-teresa-1796", "Ron Santa Teresa 1796 0,75L", "Licores", "botella", 38, 29, 3, "sí", 14],
    ["ron-cacique-500", "Ron Cacique 500 Años 0,7L", "Licores", "botella", 32, 24, 3, "sí", 20],
    ["ron-diplomatico", "Ron Diplomático Reserva Exclusiva", "Licores", "botella", 42, 33, 2, "sí", 8],
    ["whisky-buchanans-12", "Whisky Buchanan's 12 años 0,75L", "Licores", "botella", 45, 36, 2, "sí", 6],
    ["cerveza-polar-caja", "Cerveza Polar Pilsen (caja 36)", "Bebidas", "caja", 26, 20, 4, "sí", 25],
    ["cerveza-solera-6", "Cerveza Solera Verde (six pack)", "Bebidas", "pack", 7.5, 5.6, 6, "sí", 30],
    ["refresco-cocacola-2l", "Coca-Cola 2L", "Bebidas", "und", 2.6, 1.9, 12, "sí", 48],
    ["agua-minalba-1-5", "Agua Minalba 1,5L", "Bebidas", "und", 1.2, 0.8, 12, "sí", 60],
    ["harina-pan", "Harina P.A.N. 1kg", "Víveres", "und", 1.3, 0.95, 20, "sí", 80],
    ["arroz-mary", "Arroz Mary 1kg", "Víveres", "und", 1.5, 1.1, 15, "sí", 50],
    ["pasta-primor", "Pasta Primor 1kg", "Víveres", "und", 1.9, 1.4, 15, "sí", 45],
    ["aceite-diana", "Aceite Diana 1L", "Víveres", "und", 3.8, 2.9, 10, "sí", 30],
    ["queso-blanco-kg", "Queso blanco duro (kg)", "Charcutería", "kg", 7.5, 5.2, 4, "sí", 30],
    ["jamon-ahumado-kg", "Jamón ahumado (kg)", "Charcutería", "kg", 9.8, 7.1, 3, "sí", 10],
    ["doritos", "Doritos Mega Queso 150g", "Snacks", "und", 2.2, 1.5, 10, "sí", 40],
    ["chocolate-savoy", "Chocolate Savoy Cri-Cri", "Snacks", "und", 1.4, 0.95, 12, "sí", 48],
    ["hielo-bolsa", "Hielo (bolsa 3kg)", "Otros", "bolsa", 2.0, 0.9, 10, "sí", 40],
  ],
};

const GASTOS: Partial<Record<Rubro, [dia: number, concepto: string, categoria: string, proveedor: string, usd: number][]>> = {
  cafeteria: [
    [-25, "Alquiler del local", "Alquiler", "Inversiones Centro 21, C.A.", 250],
    [-20, "Café en grano y leche", "Insumos", "Distribuidora El Grano, C.A.", 46.5],
    [-15, "Pago de luz (Corpoelec)", "Servicios", "Corpoelec", 18],
    [-12, "Harina, jamón y queso para cachitos", "Insumos", "Comercial Gran Fortuna 868, C.A.", 38.2],
    [-9, "Nómina quincenal", "Nómina", "Personal", 180],
    [-6, "Vasos y servilletas", "Empaques", "Plásticos del Centro", 22.75],
    [-4, "Leche y azúcar", "Insumos", "Automercado La Fuente", 19.4],
    [-1, "Gas", "Servicios", "Gas Comunal", 6],
  ],
  bodegon: [
    [-26, "Alquiler del local", "Alquiler", "Inmobiliaria Los Palos Grandes", 400],
    [-22, "Reposición de licores", "Mercancía", "Licorería Mayorista del Este, C.A.", 520],
    [-18, "Cervezas y refrescos", "Mercancía", "Distribuidora Polar Zona Centro", 310],
    [-14, "Víveres (harina, arroz, pasta, aceite)", "Mercancía", "Makro Comercializadora", 265],
    [-10, "Nómina quincenal", "Nómina", "Personal", 300],
    [-8, "Internet y teléfono", "Servicios", "CANTV", 25],
    [-5, "Charcutería", "Mercancía", "Embutidos Plumrose", 140],
    [-2, "Bolsas y empaques", "Empaques", "Plásticos del Centro", 18],
  ],
};

const CLIENTES = ["María José", "Sr. Pedro (oficina)", "Kimberly", "Luis Alberto", "Andreína"];
const METODOS = ["Pago Móvil", "Pago Móvil", "Punto de venta", "Efectivo USD", "Transferencia", "Zelle", "Pago Móvil", "Efectivo Bs"];
const BANCOS = ["Banesco", "Mercantil", "BBVA Provincial", "Banco de Venezuela", "BNC"];

/** Generador pseudoaleatorio con semilla: los datos demo salen iguales cada vez. */
function azar(semilla: number) {
  let s = semilla;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export function datosDemo(rubro: Rubro = "cafeteria", dias = 14) {
  const catalogo = CATALOGOS[rubro] ?? CATALOGOS.cafeteria!;
  const f0 = hoy();
  const tasaUsd = 874.73;
  const tasaEur = 1021.4;
  const rnd = azar(rubro.length * 7919);

  const productos: Producto[] = catalogo.map(([id, nombre, categoria, unidad, precioUsd, costoUsd, stockMinimo, controlaStock]) => ({
    id, nombre, categoria, unidad, precioUsd, costoUsd, stockMinimo, controlaStock, activo: "sí",
  }));

  const movimientos: Movimiento[] = catalogo.filter((c) => c[8]).map((c, i) => ({
    id: `M-demo-ini-${i}`, fecha: sumarDias(f0, -dias - 1), hora: "08:00", productoId: c[0], producto: c[1], tipo: "entrada",
    cantidad: c[8]!, costoUnitUsd: c[5], origen: "manual", referencia: "", nota: "Inventario inicial", registradoPor: "Demo", anulado: "",
  }));

  const ventas: Venta[] = [];
  const detalleVentas: DetalleVenta[] = [];
  const vendibles = productos.filter((p) => p.precioUsd > 0);
  const stock = new Map(movimientos.map((m) => [m.productoId, m.cantidad]));
  let n = 0;
  for (let d = dias - 1; d >= 0; d--) {
    const fecha = sumarDias(f0, -d);
    const finDeSemana = [5, 6].includes(new Date(`${fecha}T12:00:00Z`).getUTCDay());
    const porDia = (rubro === "bodegon" ? 3 : 5) + Math.floor(rnd() * 4) + (finDeSemana ? 2 : 0);
    for (let k = 0; k < porDia; k++) {
      n++;
      const nLineas = 1 + Math.floor(rnd() * (rubro === "bodegon" ? 3 : 2.5));
      const lineas: { p: Producto; c: number }[] = [];
      for (let j = 0; j < nLineas; j++) {
        const p = vendibles[Math.floor(rnd() * vendibles.length)];
        const disponible = p.controlaStock === "sí" ? stock.get(p.id) ?? 0 : 99;
        const c = Math.min(1 + Math.floor(rnd() * (p.precioUsd > 15 ? 1.4 : 3)), disponible);
        if (c <= 0 || lineas.some((l) => l.p.id === p.id)) continue;
        lineas.push({ p, c });
        if (p.controlaStock === "sí") stock.set(p.id, disponible - c);
      }
      if (!lineas.length) continue;
      const totalUsd = redondear(lineas.reduce((s, l) => s + l.p.precioUsd * l.c, 0));
      const metodo = METODOS[Math.floor(rnd() * METODOS.length)];
      const enUsd = ["Efectivo USD", "Zelle"].includes(metodo);
      const pendiente = rnd() < 0.05;
      const id = `V-demo-${String(n).padStart(3, "0")}`;
      ventas.push({
        id, fecha, hora: `${String(8 + Math.floor(rnd() * 12)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`,
        items: lineas.map((l) => `${l.c}x ${l.p.nombre}`).join(", "), cantidad: lineas.reduce((s, l) => s + l.c, 0),
        totalUsd, estado: pendiente ? "pendiente" : "pagada", moneda: enUsd ? "USD" : "Bs",
        monto: pendiente ? 0 : enUsd ? totalUsd : redondear(totalUsd * tasaUsd), tasa: tasaUsd,
        montoUsd: totalUsd, montoBs: redondear(totalUsd * tasaUsd), metodo: pendiente ? "" : metodo,
        banco: pendiente || enUsd || metodo === "Efectivo Bs" ? "" : BANCOS[Math.floor(rnd() * BANCOS.length)],
        referencia: pendiente || enUsd || metodo.startsWith("Efectivo") ? "" : String(Math.floor(10000000 + rnd() * 89999999)),
        cliente: pendiente ? CLIENTES[n % CLIENTES.length] : "", fechaEsperada: pendiente ? sumarDias(fecha, 3) : "",
        fechaPago: pendiente ? "" : fecha, registradoPor: rnd() < 0.6 ? "Demo" : "Laura", origen: rnd() < 0.25 ? "telegram" : "webapp",
        linkCapture: "", anulado: "", requestId: "",
      });
      for (const l of lineas) {
        detalleVentas.push({
          ventaId: id, fecha, semana: inicioSemana(fecha), productoId: l.p.id, producto: l.p.nombre, cantidad: l.c,
          precioUsd: l.p.precioUsd, subtotalUsd: redondear(l.p.precioUsd * l.c), anulado: "",
        });
        if (l.p.controlaStock === "sí") {
          movimientos.push({
            id: `M-${id.slice(7)}-${detalleVentas.length}`, fecha, hora: ventas[ventas.length - 1].hora, productoId: l.p.id, producto: l.p.nombre, tipo: "salida",
            cantidad: -l.c, costoUnitUsd: l.p.costoUsd, origen: "venta", referencia: id, nota: "", registradoPor: "Demo", anulado: "",
          });
        }
      }
    }
  }

  const gastos: Gasto[] = (GASTOS[rubro] ?? GASTOS.cafeteria!).filter(([d]) => -d < dias + 1).map(([d, concepto, categoria, proveedor, usd], i) => ({
    id: `G-demo-${i + 1}`, fecha: sumarDias(f0, d), hora: "10:30", concepto, categoria, proveedor, rif: "", nroFactura: "",
    moneda: "Bs", monto: redondear(usd * tasaUsd), tasa: tasaUsd, montoUsd: usd, montoBs: redondear(usd * tasaUsd),
    metodo: "Punto de venta", referencia: "", registradoPor: "Demo", origen: "webapp", linkCapture: "", anulado: "", requestId: "",
  }));

  const tasas: Tasa[] = [{ fecha: f0, usd: tasaUsd, eur: tasaEur, fuente: "demo", consultada: `${f0} 08:00` }];

  const sal = "demo0000demo0000";
  const usuarios: Usuario[] = [
    { id: "u1", nombre: "Demo", rol: "admin", pinHash: hashPin("1234", sal), pinSal: sal, estado: "activo", intentosFallidos: 0, bloqueadoHasta: "", creado: f0, telegramId: "" },
  ];

  return { productos, ventas, detalleVentas, gastos, detalleGastos: [], movimientos, tasas, usuarios, pendientes: [] };
}
