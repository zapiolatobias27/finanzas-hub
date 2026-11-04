// Explicación del plan armada con reglas y datos del día: gratis, determinística y sin IA.
import { CLASSES, type AssetClass, type ConsultAnswers, type ConsultPlan, type Goal, type Horizon } from "./engine";
import type { MacroSnapshot } from "./macro";

export interface Explanation {
  headline: string;
  whyThisMix: string;
  perClass: { assetClass: AssetClass; comment: string }[];
  watchouts: string[];
  firstSteps: string[];
}

const GOAL_TEXT: Record<Goal, string> = {
  preservar: "proteger tu plata de la inflación",
  dolarizar: "proteger tu plata en dólares",
  renta: "generar ingresos periódicos",
  crecer: "hacer crecer tu plata",
};

const HORIZON_TEXT: Record<Horizon, string> = {
  lt1: "en menos de un año",
  "1to3": "en 1 a 3 años",
  "3to5": "en 3 a 5 años",
  gt5: "en más de 5 años",
};

const PROFILE_ARTICLE = { conservador: "conservadora", moderado: "moderada", agresivo: "agresiva" } as const;

const pct = (v: number, digits = 1) => `${v.toLocaleString("es-AR", { maximumFractionDigits: digits })}%`;

function variableShare(plan: ConsultPlan): number {
  return plan.allocations.filter((a) => ["cedear_etf", "acciones_arg", "cripto", "soberanos"].includes(a.assetClass)).reduce((s, a) => s + a.weight, 0);
}

/** Comentario de cada tipo de activo: para qué está en la cartera y qué dicen los datos de hoy. */
function classComment(c: AssetClass, a: ConsultAnswers, m: MacroSnapshot): string {
  const monthlyInflation = m.inflacionMensual?.valor ?? null;
  switch (c) {
    case "liquidez": {
      const base = "Es tu colchón: se puede rescatar en el día y te da margen para aprovechar oportunidades o cubrir imprevistos.";
      if (m.mejorPlazoFijo && monthlyInflation !== null) {
        const monthlyRate = (m.mejorPlazoFijo.tna * 100) / 12;
        const real = monthlyRate - monthlyInflation;
        return `${base} De referencia, el mejor plazo fijo paga ${pct(m.mejorPlazoFijo.tna * 100)} TNA (~${pct(monthlyRate)} mensual) contra una inflación de ${pct(monthlyInflation)} mensual: ${real >= 0 ? "hoy le gana a la inflación" : "hoy queda por debajo de la inflación"}.`;
      }
      return base;
    }
    case "lecap":
      return `Te asegura una tasa fija en pesos hasta el vencimiento. Rinde más que la liquidez y conviene si esperás que la inflación siga bajando${monthlyInflation !== null ? ` (hoy ${pct(monthlyInflation)} mensual)` : ""}.`;
    case "cer":
      return `Ajusta por inflación: te cubre si los precios suben más de lo esperado${m.inflacionInteranual !== null ? ` (la inflación interanual es ${pct(m.inflacionInteranual)})` : ""}. Es la pata de ${a.goal === "preservar" ? "tu objetivo principal" : "protección en pesos"}.`;
    case "usd_corto":
      return `Te dolariza con poco riesgo y la plata sigue disponible rápido${m.dolarMep !== null ? `; hoy el dólar MEP está en $${m.dolarMep.toLocaleString("es-AR")}` : ""}.`;
    case "ons":
      return "Deuda de empresas que paga intereses (cupones) en dólares. Suele tener menos riesgo que los bonos del Estado y da un ingreso previsible.";
    case "soberanos": {
      const rp = m.riesgoPais !== null ? ` Con el riesgo país en ${m.riesgoPais} puntos, si baja, estos bonos suben de precio; si sube, caen.` : "";
      return `Bonos del Estado en dólares: rinden más porque tienen más riesgo.${rp}`;
    }
    case "cedear_etf":
      return "Te da exposición a cientos de empresas globales con un solo instrumento, y su precio sigue al dólar. Es el motor de crecimiento a largo plazo.";
    case "acciones_arg":
      return "Empresas argentinas: pueden subir mucho cuando mejora la economía local, pero son la parte más volátil. Por eso es una porción chica.";
    case "cripto":
      return "Una porción pequeña por su alta volatilidad: puede moverse 50% o más en meses. Que no sea plata que vas a necesitar.";
  }
}

export function explainWithRules(a: ConsultAnswers, plan: ConsultPlan, m: MacroSnapshot): Explanation {
  const variable = variableShare(plan);
  const liquidity = plan.allocations.find((x) => x.assetClass === "liquidez")?.weight ?? 0;
  const top = plan.allocations[0];

  const reasons = [
    `Como querés ${GOAL_TEXT[a.goal]} y vas a necesitar la plata ${HORIZON_TEXT[a.horizon]}, la cartera es ${PROFILE_ARTICLE[plan.profile]} (riesgo ${plan.score}/100).`,
    `La parte más grande va a ${CLASSES[top.assetClass].label} (${Math.round(top.weight * 100)}%).`,
    variable > 0
      ? `Un ${Math.round(variable * 100)}% está en activos que pueden subir más pero también caer, acorde a que tolerás bajas de hasta ${a.maxDrawdown}%.`
      : "No incluye activos volátiles, porque el plazo es corto o preferís no arriesgar.",
    liquidity >= 0.15 ? `Dejamos ${Math.round(liquidity * 100)}% disponible en el día por si lo necesitás.` : "",
  ].filter(Boolean);

  const watchouts = [
    ...plan.notes,
    variable >= 0.3 ? "No hace falta entrar todo de una vez: dividir la compra de la parte variable en 3 o 4 meses reduce el riesgo de entrar en un mal momento." : "",
    "Revisá las comisiones de tu broker (compra, venta y custodia): con montos chicos pesan bastante.",
    "Una vez por año, o si algo se desvía más de 10 puntos, rebalanceá la cartera para volver a estos porcentajes.",
  ].filter(Boolean);

  const firstSteps = [
    "Abrí una cuenta en un broker registrado ante la CNV (ALyC) y transferí la plata desde tu banco.",
    liquidity > 0 ? "Empezá por la liquidez: suscribí un FCI Money Market con ese monto." : "",
    plan.allocations.some((x) => ["usd_corto", "ons", "soberanos", "cedear_etf"].includes(x.assetClass))
      ? "Para la parte en dólares, comprá dólar MEP desde el mismo broker (se acredita en uno o dos días)."
      : "",
    "Después armá el resto siguiendo el paso a paso, de mayor a menor monto.",
    "Agendate revisar cómo va en 6 meses.",
  ].filter(Boolean);

  return {
    headline: `Una cartera ${PROFILE_ARTICLE[plan.profile]} para ${GOAL_TEXT[a.goal]} ${HORIZON_TEXT[a.horizon]}`,
    whyThisMix: reasons.join(" "),
    perClass: plan.allocations.map((x) => ({ assetClass: x.assetClass, comment: classComment(x.assetClass, a, m) })),
    watchouts: watchouts.slice(0, 5),
    firstSteps: firstSteps.slice(0, 5),
  };
}
