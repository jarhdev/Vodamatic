import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ErrorAuth } from "./sesion";

/** Envuelve un handler de API para responder errores en JSON legible. */
export function manejar<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const r = await fn(...args);
      return r instanceof Response ? r : NextResponse.json(r ?? { ok: true });
    } catch (e) {
      if (e instanceof ErrorAuth) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(". ") }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error inesperado" }, { status: 500 });
    }
  };
}
