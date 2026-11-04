import { ArrowLeft, Info, ListChecks, RefreshCw, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InsightsSkeleton, NewsPanel, PlanInsights } from "@/components/consult/ai-insights";
import { AllocationDonut, MoneySankey, ScenarioRanges, classColor } from "@/components/consult/visuals";
import type { MarketResearch } from "@/lib/consulting/ai";
import { CLASSES, type ConsultAnswers, type ConsultPlan } from "@/lib/consulting/engine";
import type { Explanation } from "@/lib/consulting/explain";
import { getMacro, type MacroSnapshot } from "@/lib/consulting/macro";
import { requireUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tu plan de inversión" };
// La primera consulta del día investiga noticias: puede tardar más que el límite por defecto en Vercel.
export const maxDuration = 120;

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const PROFILE = {
  conservador: { label: "Conservador", tone: "border-info/30 bg-info/10 text-info" },
  moderado: { label: "Moderado", tone: "border-accent-2/30 bg-accent-2/10 text-accent-2" },
  agresivo: { label: "Agresivo", tone: "border-accent/30 bg-accent/10 text-accent" },
} as const;

function MacroStrip({ macro }: { macro: MacroSnapshot }) {
  const items = [
    macro.inflacionMensual && { label: "Inflación mensual", value: `${macro.inflacionMensual.valor.toLocaleString("es-AR")}%` },
    macro.inflacionInteranual !== null && { label: "Inflación interanual", value: `${macro.inflacionInteranual.toLocaleString("es-AR")}%` },
    macro.riesgoPais !== null && { label: "Riesgo país", value: `${macro.riesgoPais} pb` },
    macro.mejorPlazoFijo && { label: `Mejor plazo fijo (${macro.mejorPlazoFijo.entidad})`, value: `${(macro.mejorPlazoFijo.tna * 100).toFixed(1)}% TNA` },
    macro.dolarMep !== null && { label: "Dólar MEP", value: `$${macro.dolarMep.toLocaleString("es-AR")}` },
  ].filter((x): x is { label: string; value: string } => Boolean(x));
  if (!items.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="card px-4 py-3">
          <dt className="truncate text-xs text-muted">{i.label}</dt>
          <dd className="num text-lg font-semibold">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ConsultationPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const { supabase } = await requireUser();
  const { data } = await supabase.from("consultations").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();

  const answers = data.answers as ConsultAnswers;
  const plan = data.plan as ConsultPlan;
  const macro = (data.macro as MacroSnapshot | null) ?? (await getMacro());
  const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 });
  const profile = PROFILE[plan.profile];

  return (
    <div className="space-y-8">
      <Link href="/consultoria" className="btn-ghost w-fit px-3 py-1.5 text-muted">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Consultoría
      </Link>

      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="space-y-2">
          <p className="eyebrow reveal">Tu plan de inversión</p>
          <h1 className="reveal font-display text-4xl font-semibold tracking-tight md:text-5xl" style={delay(1)}>
            Así repartiríamos <span className="num text-accent">{money.format(plan.amount)}</span>
          </h1>
          <p className="reveal flex flex-wrap items-center gap-2 text-muted" style={delay(2)}>
            Perfil <span className={cn("chip", profile.tone)}>{profile.label}</span>
            <span className="num">· rendimiento esperado ~{(plan.expectedReturn * 100).toFixed(1)}% anual en USD</span>
          </p>
        </div>
        <div className="card reveal space-y-2 p-5" style={delay(2)}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Nivel de riesgo</span>
            <span className="num font-semibold">{plan.score}/100</span>
          </div>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-info via-accent-2 to-accent">
            <span className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full border-2 border-surface bg-ink shadow" style={{ left: `${plan.score}%` }} aria-hidden="true" />
          </div>
          <div className="flex justify-between text-[11px] text-faint">
            <span>Conservador</span>
            <span>Moderado</span>
            <span>Agresivo</span>
          </div>
          <p className="num pt-1 text-xs text-muted">En un mal año podría caer ~{Math.round(-plan.worstYear * 100)}% temporalmente.</p>
        </div>
      </header>

      {plan.notes.length > 0 && (
        <div className="space-y-2">
          {plan.notes.map((n) => (
            <p key={n} className="flex gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {n}
            </p>
          ))}
        </div>
      )}

      <section className="card reveal p-6 md:p-7" style={delay(3)}>
        <h2 className="mb-1 font-display text-lg font-semibold">El recorrido de tu plata</h2>
        <p className="mb-5 text-sm text-muted">De tu monto total a cada categoría y a cada tipo de instrumento.</p>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="min-w-[640px]">
            <MoneySankey allocations={plan.allocations} amount={plan.amount} currency={plan.currency} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card reveal p-6" style={delay(4)}>
          <h2 className="mb-4 font-display text-lg font-semibold">Cuánto en cada cosa</h2>
          <AllocationDonut allocations={plan.allocations} currency={plan.currency} />
        </section>
        <section className="card reveal p-6" style={delay(5)}>
          <h2 className="mb-4 font-display text-lg font-semibold">Cuánto podría valer</h2>
          <ScenarioRanges scenarios={plan.scenarios} amount={plan.amount} currency={plan.currency} />
        </section>
      </div>

      <section className="card reveal p-6 md:p-7" style={delay(6)}>
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold">
          <ListChecks className="h-5 w-5 text-accent" aria-hidden="true" /> Cómo armarlo, paso a paso
        </h2>
        <ol className="space-y-4">
          {plan.allocations.map((a, i) => (
            <li key={a.assetClass} className="grid grid-cols-[auto_1fr] gap-4">
              <span className="num grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: classColor(a.assetClass) }} aria-hidden="true">
                {i + 1}
              </span>
              <div className="space-y-1 border-b pb-4 last:border-b-0">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{CLASSES[a.assetClass].label}</span>
                  <span className="num font-semibold">
                    {money.format(a.amount)} <span className="text-sm font-normal text-muted">({Math.round(a.weight * 100)}%)</span>
                  </span>
                </p>
                <p className="text-sm text-muted">Ejemplos: {CLASSES[a.assetClass].examples}.</p>
                <p className="text-sm">{CLASSES[a.assetClass].how}</p>
              </div>
            </li>
          ))}
        </ol>
        {answers.experience === "ninguna" && (
          <p className="mt-4 flex gap-2 text-sm text-muted">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            Podés ir de a poco: empezá por los pasos 1 y 2 y sumá el resto mes a mes.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Datos del día</h2>
        <MacroStrip macro={macro} />
      </section>

      <Suspense fallback={<InsightsSkeleton label="Preparando el análisis de tu plan…" />}>
        <PlanInsights
          consultationId={data.id}
          answers={answers}
          plan={plan}
          macro={macro}
          stored={{ explanation: data.explanation as Explanation | null, research: data.research as MarketResearch | null }}
        />
      </Suspense>

      <Suspense fallback={<InsightsSkeleton label="Buscando las noticias del día…" />}>
        <NewsPanel plan={plan} />
      </Suspense>

      <p className="flex gap-2 border-t pt-5 text-xs text-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Simulación educativa generada a partir de tus respuestas: carteras modelo por tipo de activo con supuestos de rendimiento y riesgo. No constituye asesoramiento financiero personalizado ni una recomendación de compra o venta de valores. Los rendimientos pasados o simulados no garantizan resultados futuros. Consultá con un asesor registrado ante la CNV antes de invertir.
      </p>
    </div>
  );
}
