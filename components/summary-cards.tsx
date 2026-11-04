import { ArrowDownLeft, ArrowUpRight, LineChart, PiggyBank } from "lucide-react";
import type { MonthSummary } from "@/lib/budget";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function SummaryCards({ summary, portfolioArs }: { summary: MonthSummary; portfolioArs: number }) {
  const rate = Math.round(summary.savingsRate * 100);
  const total = Math.max(summary.income, summary.expenses, 1);
  const kpis = [
    { label: "Ingresos", value: summary.income, icon: ArrowDownLeft, tone: "text-success bg-success/10" },
    { label: "Gastos", value: summary.expenses, icon: ArrowUpRight, tone: "text-danger bg-danger/10" },
    { label: "Cartera IOL", value: portfolioArs, icon: LineChart, tone: "text-info bg-info/10" },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="card reveal relative overflow-hidden p-6 md:p-7" style={delay(1)}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-muted">
              <PiggyBank className="h-4 w-4 text-accent" aria-hidden="true" /> Ahorro del mes
            </p>
            <p className={cn("num mt-2 text-5xl font-semibold md:text-6xl", summary.net < 0 && "text-danger")}>{formatMoney(summary.net)}</p>
          </div>
          <span className={cn("chip num shrink-0", rate >= 20 ? "border-success/30 bg-success/10 text-success" : rate >= 0 ? "border-warn/30 bg-warn/10 text-warn" : "border-danger/30 bg-danger/10 text-danger")}>
            {rate}% de ahorro
          </span>
        </div>
        <div className="relative mt-6 space-y-2">
          {[
            { label: "Ingresos", value: summary.income, color: "bg-accent" },
            { label: "Gastos", value: summary.expenses, color: "bg-danger/70" },
          ].map((r) => (
            <div key={r.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs text-muted">
              <span>{r.label}</span>
              <div className="track h-2">
                <div className={cn("bar-fill", r.color)} style={{ width: `${(r.value / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {kpis.map((k, i) => (
          <div key={k.label} className="card card-hover reveal flex items-center gap-4 p-4" style={delay(2 + i)}>
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", k.tone)} aria-hidden="true">
              <k.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted">{k.label}</p>
              <p className="num truncate text-xl font-semibold">{formatMoney(k.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
