import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { unstable_cache } from "next/cache";
import * as z from "zod/v4";
import { CLASS_ORDER, CLASSES, type AssetClass, type ConsultAnswers, type ConsultPlan } from "./engine";
import type { MacroSnapshot } from "./macro";

// La IA NO decide la cartera: el motor de reglas fija los porcentajes. Claude solo
// (1) investiga noticias del día en fuentes elegidas y (2) explica el plan en lenguaje simple.

const MODEL = "claude-opus-5-5";
// Si el modelo declina por política, la API reintenta con otro modelo dentro de la misma llamada.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export const NEWS_DOMAINS = [
  "ambito.com",
  "cronista.com",
  "infobae.com",
  "lanacion.com.ar",
  "bloomberglinea.com",
  "reuters.com",
  "bcra.gob.ar",
  "indec.gob.ar",
];

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const assetClassEnum = z.enum(CLASS_ORDER as [AssetClass, ...AssetClass[]]);

/* ───────── 1. Investigación diaria del mercado ───────── */

const researchSchema = z.object({
  summary: z.string().describe("Panorama del mercado argentino hoy, 2 o 3 oraciones."),
  themes: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().describe("1 o 2 oraciones con datos concretos."),
        sources: z.array(z.number().int()).describe("Números de las fuentes que lo respaldan."),
      }),
    )
    .describe("Entre 3 y 5 temas relevantes para invertir hoy."),
  outlook: z
    .array(
      z.object({
        assetClass: assetClassEnum,
        stance: z.enum(["favorable", "neutral", "cauteloso"]),
        reason: z.string().describe("Una oración, basada en las fuentes."),
      }),
    )
    .describe("Lectura del contexto para cada tipo de activo que tenga noticias relevantes."),
  risks: z.array(z.string()).describe("Hasta 4 riesgos a vigilar."),
});

export interface Source {
  id: number;
  title: string;
  url: string;
}

export type MarketResearch = z.infer<typeof researchSchema> & { day: string; sources: Source[] };

const RESEARCH_PROMPT = (day: string, macro: MacroSnapshot) => `Hoy es ${day}. Sos analista de mercados argentino.
Buscá en las noticias de los últimos días lo más relevante para un inversor minorista argentino: tasas en pesos, inflación,
dólar (MEP/CCL), riesgo país y bonos soberanos, obligaciones negociables, Merval, mercado de EE.UU. (S&P 500/Nasdaq, que mueve
los CEDEARs) y Bitcoin. Priorizá hechos y datos con fecha por sobre opiniones. Hacé búsquedas en español.

Datos oficiales ya conocidos (no hace falta buscarlos): ${JSON.stringify(macro)}

Al final escribí notas de análisis claras indicando qué fuente respalda cada dato.`;

async function runResearch(day: string, macro: MacroSnapshot): Promise<MarketResearch> {
  const c = getClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: RESEARCH_PROMPT(day, macro) }];
  const blocks: Anthropic.Beta.BetaContentBlock[] = [];
  let finished = false;

  // La búsqueda corre en los servidores de Anthropic; si el turno se pausa (pause_turn) lo retomamos.
  for (let i = 0; i < 4 && !finished; i++) {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8, allowed_domains: NEWS_DOMAINS }],
      messages,
    });
    if (res.stop_reason === "refusal") throw new Error("La investigación fue rechazada por el modelo");
    blocks.push(...res.content);
    if (res.stop_reason === "pause_turn") messages.push({ role: "assistant", content: res.content });
    else finished = true;
  }

  // Fuentes reales que devolvió el buscador (no URLs inventadas por el modelo).
  const sources: Source[] = [];
  for (const b of blocks) {
    if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
    for (const r of b.content) {
      if (r.type === "web_search_result" && !sources.some((s) => s.url === r.url)) {
        sources.push({ id: sources.length + 1, title: r.title, url: r.url });
      }
    }
  }
  const notes = blocks
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (!notes.trim()) throw new Error("La investigación no devolvió notas");

  // Segundo paso: ordenar las notas en un JSON validado, citando solo fuentes de la lista.
  const parsed = await c.beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(researchSchema) },
    messages: [
      {
        role: "user",
        content: `Ordená estas notas de investigación en el formato pedido. Citá solo números de la lista de fuentes. No agregues datos que no estén en las notas.

NOTAS:
${notes}

FUENTES:
${sources.map((s) => `[${s.id}] ${s.title} — ${s.url}`).join("\n")}`,
      },
    ],
  });
  if (parsed.stop_reason === "refusal" || !parsed.parsed_output) throw new Error("No se pudo estructurar la investigación");

  const valid = new Set(sources.map((s) => s.id));
  const research = parsed.parsed_output;
  research.themes = research.themes.map((t) => ({ ...t, sources: t.sources.filter((id) => valid.has(id)) }));
  return { ...research, day, sources };
}

/**
 * Investigación del día, compartida entre todos los usuarios (una sola corrida por día).
 * Si falla no se cachea: el próximo intento vuelve a probar.
 */
export async function getDailyResearch(day: string, macro: MacroSnapshot): Promise<MarketResearch | null> {
  if (!aiEnabled()) return null;
  try {
    return await unstable_cache(() => runResearch(day, macro), ["market-research-v1", day], { revalidate: 60 * 60 * 24 })();
  } catch (e) {
    console.error("[ai] investigación", e);
    return null;
  }
}

/* ───────── 2. Explicación personalizada del plan ───────── */

const explanationSchema = z.object({
  headline: z.string().describe("Una frase que resuma el plan para esta persona."),
  whyThisMix: z.string().describe("Por qué esta combinación encaja con sus respuestas, 3 o 4 oraciones."),
  perClass: z.array(z.object({ assetClass: assetClassEnum, comment: z.string().describe("Rol de este tipo de activo en su cartera y qué dice el contexto actual, 1 o 2 oraciones.") })),
  watchouts: z.array(z.string()).describe("Hasta 4 cosas a vigilar."),
  firstSteps: z.array(z.string()).describe("Entre 3 y 5 pasos concretos para empezar, en orden."),
});

export type PlanExplanation = z.infer<typeof explanationSchema>;

const EXPLAIN_SYSTEM = `Explicás planes de inversión educativos a personas en Argentina, en español rioplatense (voseo), claro y sin jerga.
Reglas:
- Los porcentajes y montos del plan ya están decididos por un motor de reglas: no los cambies ni propongas otros.
- No recomiendes comprar o vender activos individuales concretos; hablá de tipos de activo y usá solo los ejemplos que vienen en el plan.
- No prometas rendimientos. Los escenarios son simulaciones con supuestos.
- Si usás datos del contexto de mercado, que sean los provistos; no inventes cifras.`;

export async function explainPlan(
  answers: ConsultAnswers,
  plan: ConsultPlan,
  research: MarketResearch | null,
  macro: MacroSnapshot,
): Promise<PlanExplanation | null> {
  if (!aiEnabled()) return null;
  try {
    const planText = plan.allocations
      .map((a) => `- ${CLASSES[a.assetClass].label} (${a.assetClass}): ${Math.round(a.weight * 100)}% (ejemplos: ${CLASSES[a.assetClass].examples})`)
      .join("\n");
    const res = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: "low", format: betaZodOutputFormat(explanationSchema) },
      system: EXPLAIN_SYSTEM,
      messages: [
        {
          role: "user",
          content: `RESPUESTAS DEL CUESTIONARIO:
${JSON.stringify(answers)}

PLAN (perfil ${plan.profile}, puntaje ${plan.score}/100, rendimiento esperado ~${(plan.expectedReturn * 100).toFixed(1)}% anual en USD, volatilidad ~${(plan.volatility * 100).toFixed(0)}%):
${planText}

AVISOS DEL MOTOR:
${plan.notes.join("\n") || "(ninguno)"}

DATOS OFICIALES:
${JSON.stringify(macro)}

CONTEXTO DE MERCADO DEL DÍA:
${research ? JSON.stringify({ summary: research.summary, themes: research.themes, outlook: research.outlook, risks: research.risks }) : "(no disponible)"}`,
        },
      ],
    });
    if (res.stop_reason === "refusal") return null;
    return res.parsed_output ?? null;
  } catch (e) {
    console.error("[ai] explicación", e);
    return null;
  }
}
