// Plantillas por rubro: cambian textos, listas y módulos visibles, no la lógica.
export type Rubro = "cafeteria" | "bodegon" | "distribuidor" | "peluqueria" | "panaderia" | "general";

export interface PlantillaRubro {
  nombre: string;
  /** Cómo se llama lo que vende: "Producto", "Servicio"... */
  itemSingular: string;
  itemPlural: string;
  categoriasGasto: string[];
  categoriasProducto: string[];
  /** Si los items vendidos descuentan inventario por defecto. */
  controlaStockPorDefecto: boolean;
}

const GASTOS_BASE = ["Mercancía", "Insumos", "Empaques", "Servicios", "Alquiler", "Nómina", "Delivery", "Mantenimiento", "Publicidad", "Impuestos", "Otros"];

export const RUBROS: Record<Rubro, PlantillaRubro> = {
  cafeteria: {
    nombre: "Cafetería",
    itemSingular: "Producto",
    itemPlural: "Productos",
    categoriasGasto: ["Insumos", "Empaques", ...GASTOS_BASE.filter((g) => !["Insumos", "Empaques", "Mercancía"].includes(g))],
    categoriasProducto: ["Bebidas calientes", "Bebidas frías", "Comida", "Postres", "Insumos"],
    controlaStockPorDefecto: true,
  },
  bodegon: {
    nombre: "Bodegón",
    itemSingular: "Producto",
    itemPlural: "Productos",
    categoriasGasto: GASTOS_BASE,
    categoriasProducto: ["Licores", "Víveres", "Charcutería", "Snacks", "Bebidas", "Limpieza", "Otros"],
    controlaStockPorDefecto: true,
  },
  distribuidor: {
    nombre: "Distribuidor",
    itemSingular: "Producto",
    itemPlural: "Productos",
    categoriasGasto: [...GASTOS_BASE, "Combustible", "Fletes"],
    categoriasProducto: ["General"],
    controlaStockPorDefecto: true,
  },
  peluqueria: {
    nombre: "Peluquería",
    itemSingular: "Servicio",
    itemPlural: "Servicios y productos",
    categoriasGasto: ["Productos", "Insumos", "Comisiones", "Alquiler", "Servicios", "Mantenimiento", "Publicidad", "Otros"],
    categoriasProducto: ["Corte", "Color", "Tratamiento", "Uñas", "Productos de venta"],
    controlaStockPorDefecto: false,
  },
  panaderia: {
    nombre: "Panadería / Repostería",
    itemSingular: "Producto",
    itemPlural: "Productos",
    categoriasGasto: ["Ingredientes", "Empaques", ...GASTOS_BASE.filter((g) => !["Insumos", "Empaques", "Mercancía"].includes(g))],
    categoriasProducto: ["Panes", "Dulces", "Tortas", "Galletas", "Ingredientes"],
    controlaStockPorDefecto: true,
  },
  general: {
    nombre: "Comercio",
    itemSingular: "Producto",
    itemPlural: "Productos",
    categoriasGasto: GASTOS_BASE,
    categoriasProducto: ["General"],
    controlaStockPorDefecto: true,
  },
};

// Métodos de pago habituales en Venezuela (mismos que usa Bombi).
export const METODOS_PAGO = ["Pago Móvil", "Transferencia", "Punto de venta", "Efectivo Bs", "Efectivo USD", "Zelle", "Binance", "Otro"] as const;

export const BANCOS = [
  "Banesco", "Mercantil", "BBVA Provincial", "Banco de Venezuela", "BNC", "Bancamiga", "Venezolano de Crédito",
  "Banco del Tesoro", "Bancaribe", "Exterior", "Banplus", "Banco Plaza", "Sofitasa", "100% Banco", "Bicentenario", "Otro",
];

/** Moneda en la que normalmente llega cada método, para pre-seleccionarla. */
export function monedaDeMetodo(metodo: string): "Bs" | "USD" {
  return ["Efectivo USD", "Zelle", "Binance"].includes(metodo) ? "USD" : "Bs";
}
