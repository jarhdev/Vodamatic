import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function nuevaSal(): string {
  return randomBytes(8).toString("hex");
}

export function hashPin(pin: string, sal: string): string {
  return scryptSync(pin, sal, 32).toString("hex");
}

export function pinValido(pin: string, sal: string, hash: string): boolean {
  if (!hash || !sal) return false;
  const a = Buffer.from(hashPin(pin, sal), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
