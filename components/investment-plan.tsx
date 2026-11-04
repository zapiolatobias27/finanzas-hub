import type { InvestmentPlan as Plan } from "@/lib/advisor";
import { formatMoney } from "@/lib/money";

const BUCKET_STYLE = {
  emergency: "bg-amber-400",
  goal: "bg-sky-500",
  long_term: "bg-emerald-500",
} as const;

export function InvestmentPlan({ plan }: { plan: Plan }) {
  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="font-semibold">Plan de inversión mensual</h2>
        <p className="text-sm text-neutral-500">
          Capacidad de ahorro promedio: <b className="tabular-nums">{formatMoney(plan.monthlySurplus)}</b> por mes
        </p>
      </div>

      {plan.warnings.map((w) => (
        <p key={w} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {w}
        </p>
      ))}

      <ol className="space-y-4">
        {plan.allocations.map((a, i) => (
          <li key={i} className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-2 font-medium">
                <span className={`h-2 w-2 rounded-full ${BUCKET_STYLE[a.bucket]}`} aria-hidden />
                {i + 1}. {a.label}
                {a.horizonMonths > 0 && a.bucket === "goal" && <span className="text-sm font-normal text-neutral-500"> · {a.horizonMonths} meses</span>}
              </p>
              <p className="tabular-nums">{formatMoney(a.monthlyAmount)}/mes</p>
            </div>
            {a.note && <p className="text-sm text-neutral-500">{a.note}</p>}
            <ul className="mt-2 space-y-2">
              {a.instruments.map((ins) => (
                <li key={ins.name} className="text-sm">
                  <p>
                    <b>{Math.round(ins.weight * 100)}%</b> · {ins.name}{" "}
                    <span className="tabular-nums text-neutral-500">({formatMoney(a.monthlyAmount * ins.weight)})</span>
                  </p>
                  <p className="text-neutral-500">{ins.why}</p>
                  <p className="text-xs text-neutral-400">Cómo: {ins.how}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="border-t pt-3 text-xs text-neutral-400 dark:border-neutral-800">{plan.disclaimer}</p>
    </section>
  );
}
