// Motor de consultoría: perfil de riesgo → cartera modelo por TIPO de activo, montos, escenarios y pasos.
// Es puro y determinístico (la IA solo agrega contexto y explicación, nunca cambia los números).
// Supuestos de rendimiento y volatilidad: ilustrativos, en USD anuales, para simular escenarios.

export type Goal = "preservar" | "dolarizar" | "renta" | "crecer";
export type Horizon = "lt1" | "1to3" | "3to5" | "gt5";
export type Reaction = "vendo" | "espero" | "compro";
export type Experience = "ninguna" | "basica" | "intermedia" | "avanzada";
export type CryptoAppetite = "no" | "poco" | "si";

export interface ConsultAnswers {
  amount: number;
  currency: "ARS" | "USD";
  goal: Goal;
  /** Rendimiento anual en USD que le gustaría obtener, en %. */
  targetReturn: number;
  horizon: Horizon;
  /** Máxima caída temporal que tolera sin vender, en %. */
  maxDrawdown: number;
  reaction: Reaction;
  /** Necesita poder retirar parte del dinero en cualquier momento. */
  needsLiquidity: boolean;
  experience: Experience;
  crypto: CryptoAppetite;
}

export type AssetClass = "liquidez" | "lecap" | "cer" | "usd_corto" | "ons" | "soberanos" | "cedear_etf" | "acciones_arg" | "cripto";
export type ClassGroup = "liquidez" | "pesos" | "dolares" | "variable" | "cripto";
export type RiskProfile = "conservador" | "moderado" | "agresivo";

export interface ClassInfo {
  label: string;
  group: ClassGroup;
  /** Rendimiento esperado anual en USD (supuesto). */
  mu: number;
  /** Volatilidad anual (supuesto). */
  sigma: number;
  examples: string;
  how: string;
}

export const CLASSES: Record<AssetClass, ClassInfo> = {
  liquidez: {
    label: "Liquidez (Money Market / caución)",
    group: "liquidez",
    mu: 0.01,
    sigma: 0.06,
    examples: "FCI Money Market en pesos, caución colocadora a 1–7 días",
    how: "En tu broker: Fondos → suscribí un FCI Money Market. Rescate en el día.",
  },
  lecap: {
    label: "Tasa fija en pesos (LECAP/BONCAP)",
    group: "pesos",
    mu: 0.03,
    sigma: 0.1,
    examples: "Letras capitalizables (tickers que empiezan con S), BONCAP",
    how: "Bonos/Letras → elegí una que venza cerca de cuando necesites la plata.",
  },
  cer: {
    label: "Bonos ajustados por inflación (CER)",
    group: "pesos",
    mu: 0.04,
    sigma: 0.12,
    examples: "Bonos TZX, BONCER (ajustan por CER)",
    how: "Bonos → filtrá por ajuste CER; preferí vencimientos de 1 a 3 años.",
  },
  usd_corto: {
    label: "Dólares con renta corta",
    group: "dolares",
    mu: 0.045,
    sigma: 0.03,
    examples: "Dólar MEP + FCI en dólares o caución en USD",
    how: "Comprá dólar MEP desde el broker y suscribí un FCI en USD (T+1).",
  },
  ons: {
    label: "Obligaciones Negociables (USD)",
    group: "dolares",
    mu: 0.07,
    sigma: 0.06,
    examples: "ONs de empresas grandes (energía, telecomunicaciones), pagan cupón en USD",
    how: "Obligaciones Negociables → diversificá entre 3 o más emisores.",
  },
  soberanos: {
    label: "Bonos soberanos en USD",
    group: "dolares",
    mu: 0.11,
    sigma: 0.18,
    examples: "Bonares y Globales (tickers AL/GD)",
    how: "Bonos → especie en dólares (terminación D). Más rendimiento, más riesgo país.",
  },
  cedear_etf: {
    label: "CEDEARs de ETFs globales",
    group: "variable",
    mu: 0.08,
    sigma: 0.17,
    examples: "SPY (S&P 500), QQQ (Nasdaq), ETFs amplios",
    how: "CEDEARs → comprá ETFs amplios y aportá todos los meses para promediar precio.",
  },
  acciones_arg: {
    label: "Acciones argentinas",
    group: "variable",
    mu: 0.12,
    sigma: 0.35,
    examples: "Panel líder del Merval (bancos, energía, utilities)",
    how: "Acciones → repartí entre varias empresas; es la parte más volátil.",
  },
  cripto: {
    label: "Cripto",
    group: "cripto",
    mu: 0.15,
    sigma: 0.6,
    examples: "Bitcoin y Ethereum (no altcoins)",
    how: "Exchange registrado ante la CNV como PSAV; llevá a tu billetera lo que no vayas a mover.",
  },
};

export const GROUP_LABEL: Record<ClassGroup, string> = {
  liquidez: "Liquidez",
  pesos: "Renta fija en pesos",
  dolares: "Renta fija en dólares",
  variable: "Renta variable",
  cripto: "Cripto",
};

export const CLASS_ORDER = Object.keys(CLASSES) as AssetClass[];

type Weights = Record<AssetClass, number>;

/** Carteras ancla (suman 1) entre las que se interpola según el puntaje. */
const ANCHORS: Record<RiskProfile, Weights> = {
  conservador: { liquidez: 0.25, lecap: 0.15, cer: 0.15, usd_corto: 0.25, ons: 0.15, soberanos: 0, cedear_etf: 0.05, acciones_arg: 0, cripto: 0 },
  moderado: { liquidez: 0.1, lecap: 0.05, cer: 0.1, usd_corto: 0.1, ons: 0.2, soberanos: 0.1, cedear_etf: 0.25, acciones_arg: 0.05, cripto: 0.05 },
  agresivo: { liquidez: 0.05, lecap: 0, cer: 0, usd_corto: 0, ons: 0.1, soberanos: 0.15, cedear_etf: 0.4, acciones_arg: 0.15, cripto: 0.15 },
};

const HORIZON_POINTS: Record<Horizon, number> = { lt1: 0, "1to3": 10, "3to5": 18, gt5: 25 };
const REACTION_POINTS: Record<Reaction, number> = { vendo: 0, espero: 12, compro: 20 };
const EXPERIENCE_POINTS: Record<Experience, number> = { ninguna: 0, basica: 4, intermedia: 7, avanzada: 10 };
const HORIZON_CAP: Record<Horizon, number> = { lt1: 25, "1to3": 60, "3to5": 85, gt5: 100 };

/** Puntaje de riesgo 0–100. El horizonte pone un techo: plata de corto plazo no va a activos volátiles. */
export function riskScore(a: ConsultAnswers): number {
  const drawdown = Math.min(30, (a.maxDrawdown / 40) * 30);
  const target = Math.min(15, (a.targetReturn / 20) * 15);
  const raw = HORIZON_POINTS[a.horizon] + drawdown + REACTION_POINTS[a.reaction] + EXPERIENCE_POINTS[a.experience] + target;
  return Math.round(Math.min(raw, HORIZON_CAP[a.horizon]));
}

export function profileFor(score: number): RiskProfile {
  return score < 35 ? "conservador" : score < 65 ? "moderado" : "agresivo";
}

function blend(a: Weights, b: Weights, t: number): Weights {
  return Object.fromEntries(CLASS_ORDER.map((k) => [k, a[k] * (1 - t) + b[k] * t])) as Weights;
}

function normalize(w: Weights): Weights {
  const total = CLASS_ORDER.reduce((s, k) => s + Math.max(0, w[k]), 0) || 1;
  return Object.fromEntries(CLASS_ORDER.map((k) => [k, Math.max(0, w[k]) / total])) as Weights;
}

/** Redondea a múltiplos de 5% manteniendo el total en 100% (método del mayor resto). */
export function roundToStep(w: Weights, step = 0.05): Weights {
  const units = Math.round(1 / step);
  const raw = CLASS_ORDER.map((k) => ({ k, v: w[k] * units }));
  const floored = raw.map((r) => ({ ...r, f: Math.floor(r.v) }));
  let left = units - floored.reduce((s, r) => s + r.f, 0);
  floored.sort((x, y) => y.v - y.f - (x.v - x.f));
  for (const r of floored) {
    if (left <= 0) break;
    if (r.v > 0) {
      r.f += 1;
      left -= 1;
    }
  }
  return Object.fromEntries(floored.map((r) => [r.k, r.f / units])) as Weights;
}

function moveWeight(w: Weights, from: AssetClass[], to: AssetClass, share: number) {
  for (const f of from) {
    const moved = w[f] * share;
    w[f] -= moved;
    w[to] += moved;
  }
}

export interface Allocation {
  assetClass: AssetClass;
  weight: number;
  amount: number;
}

export interface Scenario {
  years: number;
  bad: number;
  base: number;
  good: number;
}

export interface ConsultPlan {
  score: number;
  profile: RiskProfile;
  currency: "ARS" | "USD";
  amount: number;
  allocations: Allocation[];
  expectedReturn: number;
  volatility: number;
  /** Caída estimada en un mal año (percentil 5). */
  worstYear: number;
  scenarios: Scenario[];
  notes: string[];
}

const CORRELATION = 0.3;
const Z10 = 1.2816;

export function portfolioStats(w: Weights): { mu: number; sigma: number } {
  const mu = CLASS_ORDER.reduce((s, k) => s + w[k] * CLASSES[k].mu, 0);
  let variance = 0;
  for (const i of CLASS_ORDER) {
    for (const j of CLASS_ORDER) {
      const rho = i === j ? 1 : CORRELATION;
      variance += w[i] * w[j] * CLASSES[i].sigma * CLASSES[j].sigma * rho;
    }
  }
  return { mu, sigma: Math.sqrt(variance) };
}

/** Escenarios malo/base/bueno (percentiles 10/50/90 de una lognormal). */
export function scenarios(amount: number, mu: number, sigma: number, years = [1, 3, 5]): Scenario[] {
  const drift = Math.log(1 + mu) - (sigma * sigma) / 2;
  return years.map((t) => ({
    years: t,
    bad: amount * Math.exp(drift * t - Z10 * sigma * Math.sqrt(t)),
    base: amount * Math.exp(drift * t),
    good: amount * Math.exp(drift * t + Z10 * sigma * Math.sqrt(t)),
  }));
}

export function buildPlan(a: ConsultAnswers): ConsultPlan {
  const score = riskScore(a);
  const profile = profileFor(score);
  const notes: string[] = [];

  // 1. Interpolación entre carteras ancla según el puntaje.
  let w = score < 50 ? blend(ANCHORS.conservador, ANCHORS.moderado, score / 50) : blend(ANCHORS.moderado, ANCHORS.agresivo, (score - 50) / 50);
  w = { ...w };

  // 2. Ajustes por objetivo.
  if (a.goal === "preservar") moveWeight(w, ["soberanos", "acciones_arg"], "cer", 0.5);
  if (a.goal === "dolarizar") moveWeight(w, ["lecap", "cer"], "usd_corto", 0.8);
  if (a.goal === "renta") moveWeight(w, ["acciones_arg", "cripto", "cedear_etf"], "ons", 0.4);
  if (a.goal === "crecer") moveWeight(w, ["usd_corto", "lecap"], "cedear_etf", 0.4);

  // 3. Cripto según apetito declarado.
  const cryptoCap = a.crypto === "no" ? 0 : a.crypto === "poco" ? 0.05 : 0.15;
  if (w.cripto > cryptoCap) {
    w.cedear_etf += w.cripto - cryptoCap;
    w.cripto = cryptoCap;
  }

  // 4. Horizonte corto: solo instrumentos líquidos y de bajo riesgo.
  if (a.horizon === "lt1") {
    moveWeight(w, ["soberanos", "acciones_arg", "cripto", "cer"], "usd_corto", 1);
    moveWeight(w, ["cedear_etf", "ons"], "lecap", 1);
    notes.push("Como necesitás la plata en menos de un año, la cartera solo usa instrumentos de bajo riesgo y fácil salida.");
  }

  // 5. Necesidad de liquidez: piso de 15% disponible en el día.
  if (a.needsLiquidity && w.liquidez < 0.15) {
    const missing = 0.15 - w.liquidez;
    const total = CLASS_ORDER.reduce((s, k) => s + (k === "liquidez" ? 0 : w[k]), 0);
    for (const k of CLASS_ORDER) if (k !== "liquidez") w[k] -= (w[k] / total) * missing;
    w.liquidez = 0.15;
  }

  // 6. Si invierte en USD y quiere dolarizarse, sin instrumentos en pesos (salvo la liquidez).
  if (a.currency === "USD" && a.goal === "dolarizar") moveWeight(w, ["lecap", "cer"], "usd_corto", 1);

  const weights = roundToStep(normalize(w));
  const { mu, sigma } = portfolioStats(weights);

  if (a.targetReturn / 100 > mu + 0.02) {
    notes.push(
      `Buscás ~${a.targetReturn}% anual en dólares, pero con el riesgo que aceptás lo esperable ronda ${(mu * 100).toFixed(1)}%. Para apuntar más alto habría que aceptar caídas más fuertes o un plazo más largo.`,
    );
  }
  const worstYear = Math.exp(Math.log(1 + mu) - (sigma * sigma) / 2 - 1.645 * sigma) - 1;
  if (-worstYear * 100 > a.maxDrawdown + 5) {
    notes.push(`En un mal año esta cartera podría caer ~${Math.round(-worstYear * 100)}%, algo más que el ${a.maxDrawdown}% que tolerás. Si te incomoda, bajá la parte variable.`);
  }
  if (a.experience === "ninguna") notes.push("Arrancá por la parte de liquidez y renta fija, y sumá el resto en 2 o 3 meses, a medida que te familiarices.");

  return {
    score,
    profile,
    currency: a.currency,
    amount: a.amount,
    allocations: CLASS_ORDER.filter((k) => weights[k] > 0)
      .map((k) => ({ assetClass: k, weight: weights[k], amount: a.amount * weights[k] }))
      .sort((x, y) => y.weight - x.weight),
    expectedReturn: mu,
    volatility: sigma,
    worstYear,
    scenarios: scenarios(a.amount, mu, sigma),
    notes,
  };
}
