import { describe, expect, it } from "vitest";
import { buildInvestmentPlan, instrumentMix, monthsBetween, type AdvisorInput } from "./advisor";
import { monthSummary, type Tx } from "./budget";

const base: AdvisorInput = {
  today: "2026-11-03",
  avgMonthlyIncome: 1_500_000,
  avgMonthlyExpenses: 1_000_000,
  emergencySaved: 6_000_000,
  emergencyMonths: 6,
  riskTolerance: 3,
  usdArs: 1000,
  goals: [],
};

describe("advisor", () => {
  it("prioriza el fondo de emergencia con hasta el 50% del ahorro", () => {
    const plan = buildInvestmentPlan({ ...base, emergencySaved: 0 });
    expect(plan.allocations[0].bucket).toBe("emergency");
    expect(plan.allocations[0].monthlyAmount).toBe(250_000);
  });

  it("calcula el aporte por meta y manda el resto a largo plazo", () => {
    const plan = buildInvestmentPlan({
      ...base,
      goals: [{ id: "g", name: "Viaje", target: 2000, saved: 800, currency: "USD", deadline: "2027-11-03", priority: 3 }],
    });
    const goal = plan.allocations.find((a) => a.goalId === "g")!;
    expect(goal.monthlyAmount).toBe(100_000); // 1.200 USD × 1000 / 12 meses
    expect(plan.allocations.at(-1)?.bucket).toBe("long_term");
    expect(plan.allocations.at(-1)?.monthlyAmount).toBe(400_000);
  });

  it("avisa si una meta no llega con el ahorro disponible", () => {
    const plan = buildInvestmentPlan({
      ...base,
      goals: [{ id: "g", name: "Auto", target: 20_000_000, saved: 0, currency: "ARS", deadline: "2027-11-03", priority: 5 }],
    });
    expect(plan.warnings.some((w) => w.includes("Auto"))).toBe(true);
  });

  it("no arma plan si no hay superávit", () => {
    const plan = buildInvestmentPlan({ ...base, avgMonthlyExpenses: 1_600_000 });
    expect(plan.allocations).toHaveLength(0);
  });

  it("los pesos de cada mix suman 1", () => {
    for (const h of [6, 24, 60]) for (const r of [1, 3, 5]) for (const c of ["ARS", "USD"] as const) {
      const total = instrumentMix(h, r, c).reduce((s, i) => s + i.weight, 0);
      expect(total).toBeCloseTo(1, 1);
    }
  });

  it("cuenta meses completos", () => {
    expect(monthsBetween("2026-11-03", "2027-11-03")).toBe(12);
    expect(monthsBetween("2026-11-03", "2027-11-02")).toBe(11);
  });
});

describe("budget", () => {
  it("detecta desvío contra el promedio de 3 meses", () => {
    const tx = (date: string, amount: number): Tx => ({ id: date, date, amount, currency: "ARS", category: "comida", description: "", source: "manual" });
    const txs = [tx("2026-08-10", -50_000), tx("2026-09-10", -50_000), tx("2026-10-10", -50_000), tx("2026-11-02", -90_000)];
    const s = monthSummary(txs, "2026-11", { comida: 80_000 }, 1000);
    expect(s.byCategory[0]).toMatchObject({ spent: 90_000, overBudget: true, anomaly: true });
  });
});
