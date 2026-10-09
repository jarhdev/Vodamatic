/**
 * Prepara el Google Sheet de un cliente nuevo:
 *   1. crea las pestañas que falten con sus encabezados,
 *   2. crea el primer usuario administrador,
 *   3. (opcional) carga productos de ejemplo del rubro.
 *
 * Uso:  npx tsx --env-file=.env scripts/setup-sheet.ts --admin "Jose" --pin 4321 [--demo]
 */
import { SheetsStore } from "../src/lib/store/sheets";
import { PESTAÑAS_CALCULADAS } from "../src/lib/store/esquema";
import { hashPin, nuevaSal } from "../src/lib/pin";
import { hoy } from "../src/lib/fechas";
import { datosDemo } from "../src/lib/store/demo";

function arg(nombre: string) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const { GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Faltan GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY en el .env");
  }
  const store = new SheetsStore(GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY);
  const creadas = await store.prepararHoja(Object.values(PESTAÑAS_CALCULADAS));
  console.log(creadas.length ? `Pestañas creadas: ${creadas.join(", ")}` : "Todas las pestañas ya existían");

  const admin = arg("admin");
  const pin = arg("pin");
  if (admin && pin) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error("El PIN debe tener entre 4 y 8 dígitos");
    const usuarios = await store.listar("usuarios");
    if (usuarios.some((u) => u.nombre.toLowerCase() === admin.toLowerCase())) {
      console.log(`El usuario ${admin} ya existe`);
    } else {
      const sal = nuevaSal();
      await store.agregar("usuarios", [{
        id: `u${usuarios.length + 1}`, nombre: admin, rol: "admin", pinHash: hashPin(pin, sal), pinSal: sal,
        estado: "activo", intentosFallidos: 0, bloqueadoHasta: "", creado: hoy(),
      }]);
      console.log(`Usuario administrador creado: ${admin}`);
    }
  }

  if (process.argv.includes("--demo")) {
    const actuales = await store.listar("productos");
    if (actuales.length) console.log("Ya hay productos; no se cargan los de ejemplo");
    else {
      await store.agregar("productos", datosDemo().productos);
      console.log("Productos de ejemplo cargados");
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
