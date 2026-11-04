import { setBudget } from "@/app/actions";
import type { CategoryLine } from "@/lib/budget";
import { CATEGORIES, CATEGORY_KEYS, type Category } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { ActionForm, inputClass } from "./action-form";

const label = (c: string) => CATEGORIES[c as Category]?.label ?? c;

export function CategoryTable({ lines }: { lines: CategoryLine[] }) {
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="font-semibold">Gastos por categoría</h2>
      {lines.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay gastos este mes.</p>}
      <ul className="space-y-3">
        {lines.map((l) => {
          const ref = l.budget ?? Math.max(l.spent, l.avg3m, 1);
          return (
            <li key={l.category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  {label(l.category)}
                  {l.anomaly && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">↑ vs. promedio</span>}
                </span>
                <span className={`tabular-nums ${l.overBudget ? "font-medium text-red-600" : "text-neutral-500"}`}>
                  {formatMoney(l.spent)}
                  {l.budget !== null && ` / ${formatMoney(l.budget)}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={`h-1.5 rounded-full ${l.overBudget ? "bg-red-500" : "bg-sky-500"}`}
                  style={{ width: `${Math.min(100, (l.spent / ref) * 100)}%` }}
                />
              </div>
              {l.avg3m > 0 && <p className="text-xs text-neutral-400">Promedio 3 meses: {formatMoney(l.avg3m)}</p>}
            </li>
          );
        })}
      </ul>
      <ActionForm action={setBudget} submitLabel="Fijar presupuesto" className="flex flex-wrap gap-2 space-y-0 border-t pt-3 dark:border-neutral-800">
        <select name="category" className={`${inputClass} w-44`}>
          {CATEGORY_KEYS.filter((c) => !CATEGORIES[c].income).map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].label}
            </option>
          ))}
        </select>
        <input name="monthlyLimit" type="number" min={1} placeholder="Límite mensual ARS" required className={`${inputClass} w-44`} />
      </ActionForm>
    </section>
  );
}
