// Lectura y clasificación de noticias por RSS. Puro (sin red): lo usan el server y los tests.
import type { AssetClass } from "./engine";

export interface NewsItem {
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedAt: string | null;
}

export type Topic = "dolar" | "tasas" | "inflacion" | "bonos" | "ons" | "acciones" | "global" | "cripto";

export interface ClassifiedNews extends NewsItem {
  topics: Topic[];
}

export const TOPIC_LABEL: Record<Topic, string> = {
  dolar: "Dólar",
  tasas: "Tasas en pesos",
  inflacion: "Inflación",
  bonos: "Bonos y riesgo país",
  ons: "Obligaciones Negociables",
  acciones: "Acciones argentinas",
  global: "Mercados globales",
  cripto: "Cripto",
};

const TOPIC_RULES: Record<Topic, RegExp> = {
  dolar: /d[oó]lar|\bmep\b|\bccl\b|\bblue\b|cambiari|devalua|bandas cambiarias|tipo de cambio/i,
  tasas: /\btasas?\b|plazo fijo|lecap|boncap|licitaci[oó]n (del tesoro|de (deuda|letras|bonos))|cauci[oó]n|money market|\bfci\b/i,
  inflacion: /inflaci[oó]n|\bipc\b|\bcer\b|\bprecios\b|indec/i,
  bonos: /riesgo pa[ií]s|\bbonos?\b|globales|bonares|\bal30\b|\bgd30\b|soberan|deuda p[uú]blica/i,
  ons: /obligaciones negociables|\bons?\b|deuda corporativa/i,
  acciones: /merval|\bacciones\b|\badrs?\b|\bbyma\b|bolsa porte[nñ]a|panel l[ií]der/i,
  global: /cedear|wall street|s&p|nasdaq|reserva federal|\bfed\b|dow jones|tesoro de (ee\.?\s?uu|estados unidos)/i,
  cripto: /bitcoin|cripto|ethereum|stablecoin|\busdt\b|blockchain/i,
};

/** Qué noticias le importan a cada tipo de activo de la cartera. */
export const TOPICS_FOR_CLASS: Record<AssetClass, Topic[]> = {
  liquidez: ["tasas"],
  lecap: ["tasas", "inflacion"],
  cer: ["inflacion", "tasas"],
  usd_corto: ["dolar"],
  ons: ["ons", "dolar"],
  soberanos: ["bonos"],
  cedear_etf: ["global", "dolar"],
  acciones_arg: ["acciones"],
  cripto: ["cripto"],
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Texto plano: saca CDATA, scripts, estilos y etiquetas HTML que algunos feeds meten en la descripción. */
export function toPlainText(raw: string): string {
  const text = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(script|style|iframe)[\s\S]*$/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}

export function parseRss(xml: string, source: string): NewsItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const title = toPlainText(tag(item, "title") ?? "");
      const link = toPlainText(tag(item, "link") ?? tag(item, "guid") ?? "");
      const summary = toPlainText(tag(item, "description") ?? "").slice(0, 280);
      const date = tag(item, "pubDate") ?? tag(item, "dc:date");
      const parsed = date ? new Date(toPlainText(date)) : null;
      return {
        title,
        link,
        summary,
        source,
        publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      };
    })
    .filter((i) => i.title && /^https?:\/\//.test(i.link));
}

export function classify(item: NewsItem): Topic[] {
  const text = `${item.title} ${item.summary}`;
  return (Object.keys(TOPIC_RULES) as Topic[]).filter((t) => TOPIC_RULES[t].test(text));
}

/** Notas de rutina ("Dólar hoy: a cuánto cotiza…") que se repiten todos los días y no aportan contexto. */
const ROUTINE = /a cu[aá]nto (cotiza|opera|cerr[oó])|minuto a minuto|cotizaci[oó]n de (hoy|este)/i;

/** Noticias relevantes (con al menos un tema), sin duplicados, recientes y ordenadas de más nueva a más vieja. */
export function selectNews(items: NewsItem[], now: Date, maxAgeHours = 72): ClassifiedNews[] {
  const seen = new Set<string>();
  return items
    .filter((i) => !i.publishedAt || now.getTime() - Date.parse(i.publishedAt) <= maxAgeHours * 3_600_000)
    .filter((i) => !ROUTINE.test(i.title))
    .map((i) => ({ ...i, topics: classify(i) }))
    .filter((i) => {
      const key = i.title.toLowerCase().replace(/[^a-záéíóúñ0-9]/g, "").slice(0, 60);
      if (!i.topics.length || seen.has(key) || seen.has(i.link)) return false;
      seen.add(key);
      seen.add(i.link);
      return true;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

/** Las noticias más útiles para una cartera: primero las de los activos con más peso. */
export function newsForPlan(news: ClassifiedNews[], classes: AssetClass[], limit = 8): ClassifiedNews[] {
  const wanted = new Set(classes.flatMap((c) => TOPICS_FOR_CLASS[c]));
  return news.filter((n) => n.topics.some((t) => wanted.has(t))).slice(0, limit);
}
