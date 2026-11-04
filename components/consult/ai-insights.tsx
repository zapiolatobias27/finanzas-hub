import { AlertTriangle, ExternalLink, ListOrdered, Newspaper, Sparkles, Wand2 } from "lucide-react";
import { aiEnabled, explainPlan, getDailyResearch, type MarketResearch } from "@/lib/consulting/ai";
import { CLASSES, type ConsultAnswers, type ConsultPlan } from "@/lib/consulting/engine";
import { explainWithRules, type Explanation } from "@/lib/consulting/explain";
import type { MacroSnapshot } from "@/lib/consulting/macro";
import { getMarketNews, NEWS_FEEDS } from "@/lib/consulting/news";
import { newsForPlan, TOPIC_LABEL } from "@/lib/consulting/news-core";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const STANCE = {
  favorable: "border-success/30 bg-success/10 text-success",
  neutral: "border-line bg-surface-2 text-muted",
  cauteloso: "border-warn/30 bg-warn/10 text-warn",
} as const;

/* ───────── Explicación del plan ───────── */

/**
 * Explicación del plan. Por defecto se arma con reglas (gratis). Si hay ANTHROPIC_API_KEY configurada,
 * la redacta la IA con el contexto del día y se guarda en la consulta para no regenerarla.
 */
export async function PlanInsights({
  consultationId,
  answers,
  plan,
  macro,
  stored,
}: {
  consultationId: string;
  answers: ConsultAnswers;
  plan: ConsultPlan;
  macro: MacroSnapshot;
  stored: { explanation: Explanation | null; research: MarketResearch | null };
}) {
  let { explanation, research } = stored;
  let byAi = Boolean(explanation);

  if (!explanation && aiEnabled()) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
    research = await getDailyResearch(today, macro);
    explanation = await explainPlan(answers, plan, research, macro);
    if (explanation) {
      byAi = true;
      await createClient().from("consultations").update({ explanation, research, macro }).eq("id", consultationId);
    }
  }
  if (!explanation) explanation = explainWithRules(answers, plan, macro);

  return (
    <div className="space-y-6">
      <section className="card relative space-y-5 overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center gap-2 text-sm font-semibold text-accent">
          {byAi ? <Sparkles className="h-4 w-4" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
          {byAi ? "Análisis personalizado con IA" : "Por qué este plan"}
        </div>
        <h2 className="relative font-display text-2xl font-semibold tracking-tight first-letter:uppercase">{explanation.headline}</h2>
        <p className="relative text-muted">{explanation.whyThisMix}</p>
        <ul className="relative grid gap-3 md:grid-cols-2">
          {explanation.perClass.map((c) => (
            <li key={c.assetClass} className="rounded-2xl border bg-surface-2 p-4 text-sm">
              <p className="font-semibold">{CLASSES[c.assetClass].label}</p>
              <p className="mt-1 text-muted">{c.comment}</p>
            </li>
          ))}
        </ul>
        <div className="relative grid gap-4 md:grid-cols-2">
          {explanation.watchouts.length > 0 && (
            <div className="rounded-2xl border border-warn/30 bg-warn/5 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warn">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> A tener en cuenta
              </p>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-muted">
                {explanation.watchouts.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {explanation.firstSteps.length > 0 && (
            <div className="rounded-2xl border bg-surface-2 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ListOrdered className="h-4 w-4 text-accent" aria-hidden="true" /> Para empezar
              </p>
              <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted">
                {explanation.firstSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {research && <ResearchCard research={research} />}
    </div>
  );
}

function ResearchCard({ research }: { research: MarketResearch }) {
  const sourceById = new Map(research.sources.map((s) => [s.id, s]));
  return (
    <section className="card space-y-4 p-6 md:p-7">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" /> Lectura del mercado (IA, {research.day})
      </h2>
      <p className="text-muted">{research.summary}</p>
      <ul className="space-y-3">
        {research.themes.map((t) => (
          <li key={t.title} className="text-sm">
            <p className="font-semibold">{t.title}</p>
            <p className="text-muted">
              {t.detail}{" "}
              {t.sources.map((id) => {
                const s = sourceById.get(id);
                return s ? (
                  <a key={id} href={s.url} target="_blank" rel="noopener noreferrer" className="num ml-0.5 text-xs text-accent hover:underline" title={s.title}>
                    [{id}]
                  </a>
                ) : null;
              })}
            </p>
          </li>
        ))}
      </ul>
      {research.outlook.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {research.outlook.map((o) => (
            <span key={o.assetClass} className={cn("chip", STANCE[o.stance])} title={o.reason}>
              {CLASSES[o.assetClass].label}: {o.stance}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────── Noticias del día (RSS, gratis) ───────── */

const timeAgo = (iso: string | null, now: number) => {
  if (!iso) return "";
  const min = Math.round((now - Date.parse(iso)) / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};

export async function NewsPanel({ plan }: { plan: ConsultPlan }) {
  const all = await getMarketNews();
  const news = newsForPlan(all, plan.allocations.map((a) => a.assetClass));
  const now = Date.now();

  return (
    <section className="card space-y-4 p-6 md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Newspaper className="h-5 w-5 text-accent" aria-hidden="true" /> Noticias que afectan tu cartera
        </h2>
        <span className="text-xs text-muted">Últimas 72 h · se actualiza cada 30 min</span>
      </div>

      {news.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">No pudimos traer noticias ahora. Probá de nuevo en un rato.</p>
      ) : (
        <ul className="divide-y">
          {news.map((n, i) => (
            <li key={n.link} className="reveal py-3" style={{ "--i": i } as React.CSSProperties}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="group block space-y-1">
                <p className="flex items-start justify-between gap-3 font-medium group-hover:text-accent">
                  <span>{n.title}</span>
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-faint group-hover:text-accent" aria-hidden="true" />
                </p>
                {n.summary && <p className="line-clamp-2 text-sm text-muted">{n.summary}</p>}
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-faint">
                  <span className="font-medium text-muted">{n.source}</span>
                  {n.publishedAt && <span>· {timeAgo(n.publishedAt, now)}</span>}
                  {n.topics.map((t) => (
                    <span key={t} className="chip px-2 py-0 text-[10px]">
                      {TOPIC_LABEL[t]}
                    </span>
                  ))}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-faint">Fuentes: {[...new Set(NEWS_FEEDS.map((f) => f.source))].join(", ")} (vía RSS público). Los títulos y enlaces llevan a la nota original.</p>
    </section>
  );
}

export function InsightsSkeleton({ label }: { label: string }) {
  return (
    <section className="card space-y-4 p-6" aria-busy="true" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-accent">
        <Sparkles className="h-4 w-4 animate-pulse-soft" aria-hidden="true" /> {label}
      </p>
      <div className="space-y-2">
        {[90, 75, 82].map((w) => (
          <div key={w} className="h-3 animate-pulse rounded-full bg-track" style={{ width: `${w}%` }} />
        ))}
      </div>
    </section>
  );
}
