import { describe, expect, it } from "vitest";
import { buildPlan, riskScore, roundToStep, scenarios, type ConsultAnswers } from "./engine";

const base: ConsultAnswers = {
  amount: 10_000_000,
  currency: "ARS",
  goal: "crecer",
  targetReturn: 10,
  horizon: "3to5",
  maxDrawdown: 20,
  reaction: "espero",
  needsLiquidity: false,
  experience: "intermedia",
  crypto: "poco",
};

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe("perfil de riesgo", () => {
  it("un horizonte corto pone techo al riesgo aunque el resto sea agresivo", () => {
    const score = riskScore({ ...base, horizon: "lt1", maxDrawdown: 40, reaction: "compro", experience: "avanzada", targetReturn: 20 });
    expect(score).toBeLessThanOrEqual(25);
  });

  it("más tolerancia y plazo da más puntaje", () => {
    expect(riskScore({ ...base, horizon: "gt5", maxDrawdown: 35 })).toBeGreaterThan(riskScore(base));
  });
});

describe("buildPlan", () => {
  it("los pesos suman 100% en múltiplos de 5% y los montos suman el total", () => {
    for (const goal of ["preservar", "dolarizar", "renta", "crecer"] as const) {
      for (const horizon of ["lt1", "1to3", "3to5", "gt5"] as const) {
        const plan = buildPlan({ ...base, goal, horizon, needsLiquidity: true, crypto: "si" });
        expect(sum(plan.allocations.map((a) => a.weight))).toBeCloseTo(1, 6);
        expect(plan.allocations.every((a) => Math.abs(a.weight * 20 - Math.round(a.weight * 20)) < 1e-9)).toBe(true);
        expect(sum(plan.allocations.map((a) => a.amount))).toBeCloseTo(base.amount, 0);
      }
    }
  });

  it("sin cripto si el usuario no quiere", () => {
    const plan = buildPlan({ ...base, crypto: "no", horizon: "gt5", maxDrawdown: 40, reaction: "compro" });
    expect(plan.allocations.find((a) => a.assetClass === "cripto")).toBeUndefined();
  });

  it("menos de un año: nada de activos volátiles", () => {
    const plan = buildPlan({ ...base, horizon: "lt1" });
    const volatile = plan.allocations.filter((a) => ["cripto", "acciones_arg", "soberanos", "cedear_etf"].includes(a.assetClass));
    expect(volatile).toHaveLength(0);
  });

  it("respeta el piso de liquidez", () => {
    const plan = buildPlan({ ...base, needsLiquidity: true, horizon: "gt5", maxDrawdown: 40 });
    expect(plan.allocations.find((a) => a.assetClass === "liquidez")!.weight).toBeGreaterThanOrEqual(0.15);
  });

  it("avisa cuando el rendimiento buscado no es compatible con el riesgo", () => {
    const plan = buildPlan({ ...base, targetReturn: 25, maxDrawdown: 5, reaction: "vendo", horizon: "1to3" });
    expect(plan.notes.some((n) => n.includes("25%"))).toBe(true);
  });
});

describe("escenarios", () => {
  it("malo < base < bueno y se abren con el tiempo", () => {
    const s = scenarios(1000, 0.08, 0.2);
    for (const e of s) expect(e.bad < e.base && e.base < e.good).toBe(true);
    expect(s[2].good - s[2].bad).toBeGreaterThan(s[0].good - s[0].bad);
  });

  it("roundToStep mantiene el 100%", () => {
    const w = roundToStep({ liquidez: 0.333, lecap: 0.333, cer: 0.334, usd_corto: 0, ons: 0, soberanos: 0, cedear_etf: 0, acciones_arg: 0, cripto: 0 });
    expect(sum(Object.values(w))).toBeCloseTo(1, 9);
  });
});
