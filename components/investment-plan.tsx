import { AlertTriangle, Info, Landmark, ShieldCheck, Sprout, Target } from "lucide-react";
import type { InvestmentPlan as Plan } from "@/lib/advisor";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const BUCKET = {
  emergency: { icon: ShieldCheck, bar: "bg-accent-3", tint: "bg-accent-3/10 text-accent-3", label: "Emergencia" },
  goal: { icon: Target, bar: "bg-accent-2", tint: "bg-accent-2/10 text-accent-2", label: "Objetivo" },
  long_term: { icon: Sprout, bar: "bg-accent", tint: "bg-accent/10 text-accent", label: "Largo plazo" },
} as const;

export function InvestmentPlan({ plan }: { plan: Plan }) {
  const total = plan.allocations.reduce((s, a) => s + a.monthlyAmount, 0) || 1;

  return (
    <section className="card space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Plan del mes</p>
          <h2 className="font-display text-2xl font-semibold">Qué, cuánto y cómo invertir</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Capacidad de ahorro</p>
          <p className="num text-2xl font-semibold">{formatMoney(plan.monthlySurplus)}<span className="text-sm font-normal text-muted">/mes</span></p>
        </div>
      </header>

      {/* Distribución */}
      {plan.allocations.length > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-track">
            {plan.allocations.map((a, i) => (
              <div
                key={i}
                className={cn("bar-fill rounded-none first:rounded-l-full last:rounded-r-full", BUCKET[a.bucket].bar)}
                style={{ width: `${(a.monthlyAmount / total) * 100}%`, animationDelay: `${i * 120}ms` }}
                title={`${a.label}: ${formatMoney(a.monthlyAmount)}`}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {plan.allocations.map((a, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", BUCKET[a.bucket].bar)} aria-hidden="true" />
                {a.label} <span className="num text-ink">{Math.round((a.monthlyAmount / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {w}
        </p>
      ))}

      <ol className="space-y-4">
        {plan.allocations.map((a, i) => {
          const b = BUCKET[a.bucket];
          return (
            <li key={i} className="card-hover reveal rounded-2xl border bg-surface-2 p-5" style={{ "--i": i } as React.CSSProperties}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", b.tint)} aria-hidden="true">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-xs text-muted">
                      {b.label}
                      {a.bucket === "goal" && a.horizonMonths > 0 && ` · ${a.horizonMonths} meses`}
                    </p>
                  </div>
                </div>
                <p className="num text-xl font-semibold">
                  {formatMoney(a.monthlyAmount)}
                  <span className="text-xs font-normal text-muted">/mes</span>
                </p>
              </div>
              {a.note && <p className="mt-2 text-sm text-muted">{a.note}</p>}

              <ul className="mt-4 space-y-3">
                {a.instruments.map((ins) => (
                  <li key={ins.name} className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-medium">
                        <Landmark className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
                        {ins.name}
                      </span>
                      <span className="num shrink-0 text-muted">
                        {Math.round(ins.weight * 100)}% · <span className="text-ink">{formatMoney(a.monthlyAmount * ins.weight)}</span>
                      </span>
                    </div>
                    <div className="track h-1">
                      <div className={cn("bar-fill", b.bar)} style={{ width: `${ins.weight * 100}%` }} />
                    </div>
                    <p className="text-muted">{ins.why}</p>
                    <p className="text-xs text-faint">Cómo: {ins.how}</p>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <p className="flex gap-2 border-t pt-4 text-xs text-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {plan.disclaimer}
      </p>
    </section>
  );
}
