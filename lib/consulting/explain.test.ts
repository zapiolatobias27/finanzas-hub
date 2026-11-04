import { describe, expect, it } from "vitest";
import { buildPlan, type ConsultAnswers } from "./engine";
import { explainWithRules } from "./explain";
import type { MacroSnapshot } from "./macro";

const answers: ConsultAnswers = {
  amount: 10_000_000,
  currency: "ARS",
  goal: "crecer",
  targetReturn: 8,
  horizon: "3to5",
  maxDrawdown: 20,
  reaction: "espero",
  needsLiquidity: true,
  experience: "intermedia",
  crypto: "poco",
};

const macro: MacroSnapshot = {
  riesgoPais: 831,
  inflacionMensual: { valor: 1.9, fecha: "2026-09-30" },
  inflacionInteranual: 33.4,
  mejorPlazoFijo: { tna: 0.24, entidad: "Banco X" },
  dolarMep: 1583.8,
  dolarBlue: 1570,
};

describe("explainWithRules", () => {
  const plan = buildPlan(answers);
  const e = explainWithRules(answers, plan, macro);

  it("comenta cada tipo de activo del plan, en el mismo orden", () => {
    expect(e.perClass.map((c) => c.assetClass)).toEqual(plan.allocations.map((a) => a.assetClass));
    expect(e.perClass.every((c) => c.comment.length > 20)).toBe(true);
  });

  it("usa los datos del día", () => {
    const liquidez = e.perClass.find((c) => c.assetClass === "liquidez")!.comment;
    expect(liquidez).toContain("24% TNA");
    expect(liquidez).toContain("hoy le gana a la inflación"); // 2% mensual vs 1,9%
    expect(e.perClass.find((c) => c.assetClass === "soberanos")?.comment).toContain("831");
  });

  it("refleja las respuestas en el resumen", () => {
    expect(e.headline).toContain("hacer crecer tu plata");
    expect(e.whyThisMix).toContain("20%");
    expect(e.firstSteps[0]).toContain("CNV");
  });

  it("funciona sin datos del día", () => {
    const empty: MacroSnapshot = { riesgoPais: null, inflacionMensual: null, inflacionInteranual: null, mejorPlazoFijo: null, dolarMep: null, dolarBlue: null };
    expect(() => explainWithRules(answers, plan, empty)).not.toThrow();
  });
});
