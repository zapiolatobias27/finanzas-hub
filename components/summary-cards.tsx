import type { MonthSummary } from "@/lib/budget";
import { formatMoney } from "@/lib/money";

export function SummaryCards({ summary, portfolioArs }: { summary: MonthSummary; portfolioArs: number }) {
  const cards = [
    { label: "Ingresos", value: formatMoney(summary.income), tone: "text-emerald-600" },
    { label: "Gastos", value: formatMoney(summary.expenses), tone: "text-red-600" },
    { label: "Ahorro del mes", value: formatMoney(summary.net), tone: summary.net >= 0 ? "text-emerald-600" : "text-red-600" },
    { label: "Tasa de ahorro", value: `${Math.round(summary.savingsRate * 100)}%`, tone: "" },
    { label: "Cartera IOL", value: formatMoney(portfolioArs), tone: "" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">{c.label}</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
        </div>
      ))}
    </section>
  );
}
