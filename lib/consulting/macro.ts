import "server-only";
import { z } from "zod";
import { getFxRates } from "../market";

// Números duros (no opiniones) para dar contexto a la consulta. Fuente: argentinadatos.com (datos de INDEC/BCRA/bancos).
const TTL = 60 * 60;
const BASE = "https://api.argentinadatos.com/v1/finanzas";

const pointSchema = z.object({ fecha: z.string(), valor: z.number() });
const plazoFijoSchema = z.array(z.object({ entidad: z.string(), tnaClientes: z.number().nullable() }));

export interface MacroSnapshot {
  riesgoPais: number | null;
  inflacionMensual: { valor: number; fecha: string } | null;
  inflacionInteranual: number | null;
  /** Mejor TNA de plazo fijo a 30 días (fracción, ej 0.22 = 22%). */
  mejorPlazoFijo: { tna: number; entidad: string } | null;
  dolarMep: number | null;
  dolarBlue: number | null;
}

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: TTL } });
    if (!res.ok) return null;
    return schema.parse(await res.json());
  } catch (e) {
    console.error("[macro]", path, e);
    return null;
  }
}

export async function getMacro(): Promise<MacroSnapshot> {
  const [riesgo, inflacion, interanual, plazoFijo, fx] = await Promise.all([
    get("/indices/riesgo-pais/ultimo", pointSchema),
    get("/indices/inflacion", z.array(pointSchema)),
    get("/indices/inflacionInteranual", z.array(pointSchema)),
    get("/tasas/plazoFijo", plazoFijoSchema),
    getFxRates(),
  ]);
  const best = (plazoFijo ?? []).filter((p) => p.tnaClientes).sort((a, b) => (b.tnaClientes ?? 0) - (a.tnaClientes ?? 0))[0];
  const lastInflation = inflacion?.at(-1);
  return {
    riesgoPais: riesgo?.valor ?? null,
    inflacionMensual: lastInflation ? { valor: lastInflation.valor, fecha: lastInflation.fecha } : null,
    inflacionInteranual: interanual?.at(-1)?.valor ?? null,
    mejorPlazoFijo: best ? { tna: best.tnaClientes!, entidad: best.entidad } : null,
    dolarMep: fx?.mep ?? null,
    dolarBlue: fx?.blue ?? null,
  };
}
