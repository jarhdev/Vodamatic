import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "./store";
import { pinValido } from "./pin";

export interface Sesion {
  uid: string;
  nombre: string;
  rol: "admin" | "usuario";
  exp: number;
}

const COOKIE = "sesion";
const DURACION_S = 30 * 24 * 3600;
const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.GOOGLE_SHEET_ID) throw new Error("Falta SESSION_SECRET");
  return "solo-para-demo-no-usar-en-produccion";
}

const firmar = (datos: string) => createHmac("sha256", secreto()).update(datos).digest("base64url");

export function crearToken(s: Omit<Sesion, "exp">): string {
  const datos = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + DURACION_S })).toString("base64url");
  return `${datos}.${firmar(datos)}`;
}

export function leerToken(token: string | undefined): Sesion | null {
  if (!token) return null;
  const [datos, firma] = token.split(".");
  if (!datos || !firma) return null;
  const a = Buffer.from(firma);
  const b = Buffer.from(firmar(datos));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(datos, "base64url").toString()) as Sesion;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export async function sesionActual(): Promise<Sesion | null> {
  const s = leerToken((await cookies()).get(COOKIE)?.value);
  if (s) return s;
  // Integraciones (n8n, bots): header X-Api-Key con la clave del .env
  const key = (await headers()).get("x-api-key");
  if (key && process.env.API_KEY && key.length === process.env.API_KEY.length &&
      timingSafeEqual(Buffer.from(key), Buffer.from(process.env.API_KEY))) {
    return { uid: "api", nombre: "API", rol: "admin", exp: 0 };
  }
  return null;
}

/** Para páginas: redirige a /login si no hay sesión. */
export async function requerirSesion(): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect("/login");
  return s;
}

export class ErrorAuth extends Error {
  constructor(msg: string, public status = 401) {
    super(msg);
  }
}

/** Para rutas API: lanza ErrorAuth si no hay sesión (o si se pide admin y no lo es). */
export async function sesionApi(soloAdmin = false): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) throw new ErrorAuth("No has iniciado sesión");
  if (soloAdmin && s.rol !== "admin") throw new ErrorAuth("Solo un administrador puede hacer esto", 403);
  return s;
}

export async function iniciarSesion(nombre: string, pin: string): Promise<Sesion> {
  const store = getStore();
  const usuarios = await store.listar("usuarios");
  const u = usuarios.find((x) => x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && x.estado !== "inactivo");
  if (!u) throw new ErrorAuth("Usuario o PIN incorrecto");
  if (u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date()) {
    throw new ErrorAuth("Demasiados intentos. Intenta de nuevo en unos minutos.", 429);
  }
  if (!pinValido(pin, u.pinSal, u.pinHash)) {
    const intentos = (u.intentosFallidos || 0) + 1;
    const bloquear = intentos >= MAX_INTENTOS;
    await store.actualizar("usuarios", (x) => x.id === u.id, {
      intentosFallidos: bloquear ? 0 : intentos,
      bloqueadoHasta: bloquear ? new Date(Date.now() + BLOQUEO_MIN * 60_000).toISOString() : "",
    });
    throw new ErrorAuth("Usuario o PIN incorrecto");
  }
  if (u.intentosFallidos || u.bloqueadoHasta) {
    await store.actualizar("usuarios", (x) => x.id === u.id, { intentosFallidos: 0, bloqueadoHasta: "" });
  }
  const sesion = { uid: u.id, nombre: u.nombre, rol: (u.rol === "admin" ? "admin" : "usuario") as Sesion["rol"] };
  (await cookies()).set(COOKIE, crearToken(sesion), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_S,
  });
  return { ...sesion, exp: 0 };
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}
