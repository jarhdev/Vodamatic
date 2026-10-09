// Definición de cada pestaña del Google Sheet: nombre, columnas (clave -> encabezado) y cuáles son numéricas.
// La app lee por NOMBRE de encabezado, así que el dueño puede reordenar columnas o agregar las suyas.

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precioUsd: number;
  costoUsd: number;
  stockMinimo: number;
  controlaStock: string; // "sí" | "no"
  activo: string; // "sí" | "no"
}

export interface Venta {
  id: string;
  fecha: string;
  hora: string;
  items: string;
  cantidad: number;
  totalUsd: number;
  estado: string; // "pagada" | "pendiente"
  moneda: string;
  monto: number;
  tasa: number;
  montoUsd: number;
  montoBs: number;
  metodo: string;
  banco: string;
  referencia: string;
  cliente: string;
  fechaEsperada: string;
  fechaPago: string;
  registradoPor: string;
  origen: string;
  linkCapture: string;
  anulado: string;
  requestId: string;
}

export interface DetalleVenta {
  ventaId: string;
  fecha: string;
  semana: string;
  productoId: string;
  producto: string;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
  anulado: string;
}

export interface Gasto {
  id: string;
  fecha: string;
  hora: string;
  concepto: string;
  categoria: string;
  proveedor: string;
  rif: string;
  nroFactura: string;
  moneda: string;
  monto: number;
  tasa: number;
  montoUsd: number;
  montoBs: number;
  metodo: string;
  referencia: string;
  registradoPor: string;
  origen: string;
  linkCapture: string;
  anulado: string;
  requestId: string;
}

export interface DetalleGasto {
  gastoId: string;
  fecha: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  costoUnitUsd: number;
  subtotalUsd: number;
  anulado: string;
}

export interface Movimiento {
  id: string;
  fecha: string;
  hora: string;
  productoId: string;
  producto: string;
  tipo: string; // "entrada" | "salida" | "ajuste"
  cantidad: number; // con signo: + entra, - sale
  costoUnitUsd: number;
  origen: string; // "venta" | "gasto" | "manual"
  referencia: string; // ID de la venta/gasto
  nota: string;
  registradoPor: string;
  anulado: string;
}

export interface Tasa {
  fecha: string;
  usd: number;
  eur: number;
  fuente: string;
  consultada: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: string; // "admin" | "usuario"
  pinHash: string;
  pinSal: string;
  estado: string; // "activo" | "inactivo"
  intentosFallidos: number;
  bloqueadoHasta: string;
  creado: string;
  telegramId: string;
}

/** Registros que llegan por Telegram y esperan confirmación (✅) antes de guardarse. */
export interface Pendiente {
  id: string;
  tipo: string; // "?" | "venta" | "gasto"
  estado: string; // "esperando" | "leido" | "confirmado" | "descartado"
  creado: string;
  chatId: string;
  usuario: string;
  archivo: string; // file_id de Telegram + mime, como JSON
  datos: string; // JSON con lo leído por la IA
}

export interface Filas {
  productos: Producto;
  ventas: Venta;
  detalleVentas: DetalleVenta;
  gastos: Gasto;
  detalleGastos: DetalleGasto;
  movimientos: Movimiento;
  tasas: Tasa;
  usuarios: Usuario;
  pendientes: Pendiente;
}

export type Tabla = keyof Filas;

interface DefTabla<T> {
  pestaña: string;
  columnas: { [K in keyof T]: string };
  numericas: (keyof T)[];
}

export const TABLAS: { [K in Tabla]: DefTabla<Filas[K]> } = {
  productos: {
    pestaña: "Productos",
    columnas: { id: "ID", nombre: "Nombre", categoria: "Categoría", unidad: "Unidad", precioUsd: "Precio USD", costoUsd: "Costo USD", stockMinimo: "Stock mínimo", controlaStock: "Controla stock", activo: "Activo" },
    numericas: ["precioUsd", "costoUsd", "stockMinimo"],
  },
  ventas: {
    pestaña: "Ventas",
    columnas: {
      id: "ID", fecha: "Fecha", hora: "Hora", items: "Productos", cantidad: "Cantidad", totalUsd: "Total USD", estado: "Estado",
      moneda: "Moneda", monto: "Monto", tasa: "Tasa", montoUsd: "Monto USD", montoBs: "Monto Bs", metodo: "Método", banco: "Banco",
      referencia: "Referencia", cliente: "Cliente", fechaEsperada: "Fecha esperada pago", fechaPago: "Fecha pago",
      registradoPor: "Registrado por", origen: "Origen", linkCapture: "Link capture", anulado: "Anulado", requestId: "Request id",
    },
    numericas: ["cantidad", "totalUsd", "monto", "tasa", "montoUsd", "montoBs"],
  },
  detalleVentas: {
    pestaña: "Detalle ventas",
    columnas: { ventaId: "Venta", fecha: "Fecha", semana: "Semana (lunes)", productoId: "Producto id", producto: "Producto", cantidad: "Cantidad", precioUsd: "Precio USD", subtotalUsd: "Subtotal USD", anulado: "Anulado" },
    numericas: ["cantidad", "precioUsd", "subtotalUsd"],
  },
  gastos: {
    pestaña: "Gastos",
    columnas: {
      id: "ID", fecha: "Fecha", hora: "Hora", concepto: "Concepto", categoria: "Categoría", proveedor: "Proveedor", rif: "RIF",
      nroFactura: "Nº factura", moneda: "Moneda", monto: "Monto", tasa: "Tasa", montoUsd: "Monto USD", montoBs: "Monto Bs",
      metodo: "Método", referencia: "Referencia", registradoPor: "Registrado por", origen: "Origen", linkCapture: "Link capture",
      anulado: "Anulado", requestId: "Request id",
    },
    numericas: ["monto", "tasa", "montoUsd", "montoBs"],
  },
  detalleGastos: {
    pestaña: "Detalle gastos",
    columnas: { gastoId: "Gasto", fecha: "Fecha", productoId: "Producto id", descripcion: "Descripción", cantidad: "Cantidad", costoUnitUsd: "Costo unit. USD", subtotalUsd: "Subtotal USD", anulado: "Anulado" },
    numericas: ["cantidad", "costoUnitUsd", "subtotalUsd"],
  },
  movimientos: {
    pestaña: "Inventario",
    columnas: {
      id: "ID", fecha: "Fecha", hora: "Hora", productoId: "Producto id", producto: "Producto", tipo: "Movimiento", cantidad: "Cantidad",
      costoUnitUsd: "Costo unit. USD", origen: "Origen", referencia: "Referencia", nota: "Nota", registradoPor: "Registrado por", anulado: "Anulado",
    },
    numericas: ["cantidad", "costoUnitUsd"],
  },
  tasas: {
    pestaña: "Tasas",
    columnas: { fecha: "Fecha", usd: "Tasa USD (BCV)", eur: "Tasa EUR (BCV)", fuente: "Fuente", consultada: "Consultada" },
    numericas: ["usd", "eur"],
  },
  usuarios: {
    pestaña: "Usuarios",
    columnas: { id: "ID", nombre: "Nombre", rol: "Rol", pinHash: "PIN hash", pinSal: "PIN sal", estado: "Estado", intentosFallidos: "Intentos fallidos", bloqueadoHasta: "Bloqueado hasta", creado: "Creado", telegramId: "Telegram ID" },
    numericas: ["intentosFallidos"],
  },
  pendientes: {
    pestaña: "Pendientes",
    columnas: { id: "ID", tipo: "Tipo", estado: "Estado", creado: "Creado", chatId: "Chat ID", usuario: "Usuario", archivo: "Archivo", datos: "Datos" },
    numericas: [],
  },
};

/** Pestañas hechas solo de fórmulas sobre las demás (las crea scripts/setup-sheet.ts). */
export const PESTAÑAS_CALCULADAS = { resumen: "Resumen", stock: "Stock" } as const;

export type Celda = string | number;

export interface Store {
  listar<T extends Tabla>(tabla: T): Promise<Filas[T][]>;
  agregar<T extends Tabla>(tabla: T, filas: Filas[T][]): Promise<void>;
  /** Aplica `cambios` a cada fila que cumpla `donde`. Devuelve cuántas cambió. */
  actualizar<T extends Tabla>(tabla: T, donde: (f: Filas[T]) => boolean, cambios: Partial<Filas[T]>): Promise<number>;
}
