// Motor de recomendaciones de inversión basado en reglas (qué, cuánto y cómo).
// Es una herramienta educativa: sugiere TIPOS de instrumentos según horizonte y perfil de riesgo,
// no tickers puntuales ni timing de mercado.
import { toARS, type Currency } from "./money";

export interface AdvisorGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  currency: Currency;
  deadline: string;
  priority: number;
}

export interface AdvisorInput {
  today: string;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  emergencySaved: number;
  emergencyMonths: number;
  /** 1 = muy conservador … 5 = agresivo */
  riskTolerance: number;
  usdArs: number;
  goals: AdvisorGoal[];
}

export interface Instrument {
  name: string;
  weight: number;
  why: string;
  how: string;
}

export interface Allocation {
  bucket: "emergency" | "goal" | "long_term";
  label: string;
  goalId?: string;
  /** Aporte mensual sugerido, en ARS */
  monthlyAmount: number;
  horizonMonths: number;
  currency: Currency;
  instruments: Instrument[];
  note?: string;
}

export interface InvestmentPlan {
  monthlySurplus: number;
  allocations: Allocation[];
  warnings: string[];
  disclaimer: string;
}

export const DISCLAIMER =
  "Sugerencias educativas generadas por reglas a partir de tus datos. No constituyen asesoramiento financiero personalizado: antes de invertir, evaluá los riesgos y consultá con un asesor registrado ante la CNV.";

const EMERGENCY_MAX_SHARE = 0.5;
const EMERGENCY_FILL_MONTHS = 6;

export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) + (td >= fd ? 0 : -1));
}

const I = {
  moneyMarket: {
    name: "FCI Money Market",
    why: "Liquidez inmediata y bajo riesgo: ideal para plata que puede hacer falta en cualquier momento.",
    how: "En IOL: Operar → Fondos → suscribir un FCI Money Market en pesos.",
  },
  lecap: {
    name: "Letras/Bonos a tasa fija (LECAP/BONCAP)",
    why: "Tasa conocida de antemano; elegí un vencimiento cercano a la fecha de tu meta.",
    how: "En IOL: Operar → Bonos/Letras → buscá una letra que venza antes de tu fecha objetivo.",
  },
  cer: {
    name: "Bonos ajustados por CER",
    why: "Te cubren de la inflación en horizontes de 1 a 3 años.",
    how: "En IOL: Operar → Bonos → filtrá por ajuste CER con vencimiento acorde.",
  },
  usdFci: {
    name: "FCI en dólares (T+1)",
    why: "Mantiene la meta en dólares con liquidez y algo de rendimiento.",
    how: "Comprá dólar MEP desde el broker y suscribí un FCI en USD.",
  },
  ons: {
    name: "Obligaciones Negociables en USD",
    why: "Deuda corporativa que paga renta en dólares; menor riesgo que la deuda soberana.",
    how: "En IOL: Operar → Obligaciones Negociables; diversificá entre emisores.",
  },
  sovereign: {
    name: "Bonos soberanos en USD (Bonares/Globales)",
    why: "Rendimiento mayor a cambio de riesgo país; solo para perfiles moderados o más.",
    how: "En IOL: Operar → Bonos → especie en dólares (terminación D).",
  },
  cedearEtf: {
    name: "CEDEARs de ETFs diversificados (ej: S&P 500)",
    why: "Exposición global diversificada y dolarizada para el largo plazo.",
    how: "En IOL: Operar → CEDEARs; preferí ETFs amplios y aportá todos los meses (promediás precio).",
  },
  equities: {
    name: "Acciones argentinas (panel líder)",
    why: "Potencial de crecimiento alto con volatilidad alta.",
    how: "En IOL: Operar → Acciones; no más de una porción chica del total.",
  },
} as const;

type Key = keyof typeof I;

/** Mix de instrumentos según horizonte (meses), riesgo (1–5) y moneda de la meta. */
export function instrumentMix(horizonMonths: number, risk: number, currency: Currency): Instrument[] {
  let mix: [Key, number][];
  if (horizonMonths <= 12) {
    mix = currency === "USD" ? [["usdFci", 1]] : risk <= 2 ? [["moneyMarket", 0.6], ["lecap", 0.4]] : [["moneyMarket", 0.3], ["lecap", 0.7]];
  } else if (horizonMonths <= 36) {
    if (currency === "USD") mix = risk <= 2 ? [["usdFci", 0.5], ["ons", 0.5]] : [["ons", 0.6], ["sovereign", 0.4]];
    else mix = risk <= 2 ? [["lecap", 0.4], ["cer", 0.6]] : [["cer", 0.6], ["ons", 0.2], ["cedearEtf", 0.2]];
  } else {
    const equity = [0.2, 0.35, 0.5, 0.65, 0.8][Math.min(4, Math.max(0, risk - 1))];
    const local = risk >= 4 ? 0.15 : 0;
    mix = [
      ["cedearEtf", equity - local],
      ...(local ? ([["equities", local]] as [Key, number][]) : []),
      ["ons", (1 - equity) * 0.6],
      [currency === "USD" || risk >= 3 ? "sovereign" : "cer", (1 - equity) * 0.4],
    ];
  }
  return mix.filter(([, w]) => w > 0).map(([k, weight]) => ({ ...I[k], weight: Math.round(weight * 100) / 100 }));
}

export function buildInvestmentPlan(input: AdvisorInput): InvestmentPlan {
  const warnings: string[] = [];
  const surplus = input.avgMonthlyIncome - input.avgMonthlyExpenses;
  if (surplus <= 0) {
    return {
      monthlySurplus: surplus,
      allocations: [],
      warnings: ["Hoy gastás igual o más de lo que ingresás. El primer paso es generar ahorro: revisá las categorías con desvío."],
      disclaimer: DISCLAIMER,
    };
  }

  let available = surplus;
  const allocations: Allocation[] = [];

  // 1. Fondo de emergencia primero
  const emergencyTarget = input.emergencyMonths * input.avgMonthlyExpenses;
  const emergencyGap = Math.max(0, emergencyTarget - input.emergencySaved);
  if (emergencyGap > 0) {
    const amount = Math.min(available * EMERGENCY_MAX_SHARE, emergencyGap / EMERGENCY_FILL_MONTHS, emergencyGap);
    available -= amount;
    allocations.push({
      bucket: "emergency",
      label: "Fondo de emergencia",
      monthlyAmount: amount,
      horizonMonths: 0,
      currency: "ARS",
      instruments: instrumentMix(0, 1, "ARS"),
      note: `Objetivo: ${input.emergencyMonths} meses de gastos. Te faltan ${Math.round(emergencyGap).toLocaleString("es-AR")} ARS.`,
    });
  }

  // 2. Metas: por prioridad y luego por fecha. Si no alcanza, se prorratea y se avisa.
  const goals = input.goals
    .map((g) => {
      const remaining = Math.max(0, toARS(g.target - g.saved, g.currency, input.usdArs));
      const months = Math.max(1, monthsBetween(input.today, g.deadline));
      return { g, remaining, months, required: remaining / months };
    })
    .filter((x) => x.remaining > 0)
    .sort((a, b) => b.g.priority - a.g.priority || a.g.deadline.localeCompare(b.g.deadline));

  for (const x of goals) {
    const amount = Math.min(x.required, available);
    available -= amount;
    let note: string | undefined;
    if (amount < x.required) {
      const monthsNeeded = amount > 0 ? Math.ceil(x.remaining / amount) : null;
      note = monthsNeeded
        ? `Con este aporte llegás en ~${monthsNeeded} meses (no en ${x.months}).`
        : "Sin margen para esta meta con el ahorro actual.";
      warnings.push(`"${x.g.name}" necesita ${Math.round(x.required).toLocaleString("es-AR")} ARS/mes y solo hay ${Math.round(amount).toLocaleString("es-AR")}.`);
    }
    allocations.push({
      bucket: "goal",
      label: x.g.name,
      goalId: x.g.id,
      monthlyAmount: amount,
      horizonMonths: x.months,
      currency: x.g.currency,
      instruments: instrumentMix(x.months, input.riskTolerance, x.g.currency),
      note,
    });
  }

  // 3. Lo que sobra va a largo plazo (dolarizado y diversificado)
  if (available > 0) {
    allocations.push({
      bucket: "long_term",
      label: "Inversión de largo plazo",
      monthlyAmount: available,
      horizonMonths: 60,
      currency: "USD",
      instruments: instrumentMix(60, input.riskTolerance, "USD"),
    });
  }

  if (input.avgMonthlyIncome > 0 && surplus / input.avgMonthlyIncome < 0.1) {
    warnings.push("Tu tasa de ahorro es menor al 10%. Subirla tiene más impacto que cualquier inversión.");
  }

  return { monthlySurplus: surplus, allocations, warnings, disclaimer: DISCLAIMER };
}
