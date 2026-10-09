import { describe, expect, it } from "vitest";
import { aNumero, equivalentes } from "@/lib/dinero";
import { inicioSemana, normalizarFecha } from "@/lib/fechas";

describe("aNumero", () => {
  it.each([
    ["2,50", 2.5],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["6065,93", 6065.93],
    ["$ 7", 7],
    ["1.000.000", 1000000],
    ["", 0],
    [12.5, 12.5],
  ])("%s -> %s", (entrada, esperado) => {
    expect(aNumero(entrada)).toBe(esperado);
  });
});

describe("equivalentes", () => {
  it("convierte Bs a USD con la tasa (caso real de Bombi)", () => {
    expect(equivalentes(6065.93, "Bs", 866.5612)).toEqual({ montoUsd: 7, montoBs: 6065.93 });
  });
  it("convierte USD a Bs", () => {
    expect(equivalentes(20, "USD", 872.39)).toEqual({ montoUsd: 20, montoBs: 17447.8 });
  });
  it("rechaza tasa cero", () => {
    expect(() => equivalentes(1, "Bs", 0)).toThrow();
  });
});

describe("fechas", () => {
  it("inicio de semana es lunes", () => {
    expect(inicioSemana("2026-10-09")).toBe("2026-10-05"); // viernes -> lunes
    expect(inicioSemana("2026-10-05")).toBe("2026-10-05");
    expect(inicioSemana("2026-10-11")).toBe("2026-10-05"); // domingo
  });
  it("normaliza formatos de Sheets", () => {
    expect(normalizarFecha("09/10/2026")).toBe("2026-10-09");
    expect(normalizarFecha(46304)).toBe("2026-10-09");
  });
});
