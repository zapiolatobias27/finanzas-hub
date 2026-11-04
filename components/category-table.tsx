import { TrendingUp } from "lucide-react";
import { setBudget } from "@/app/actions";
import type { CategoryLine } from "@/lib/budget";
import { CATEGORIES, CATEGORY_KEYS, type Category } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm } from "./action-form";

const label = (c: string) => CATEGORIES[c as Category]?.label ?? c;

export function CategoryTable({ lines }: { lines: CategoryLine[] }) {
  const max = Math.max(1, ...lines.map((l) => Math.max(l.spent, l.budget ?? 0)));

  return (
    <section className="card space-y-5 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Gastos por categoría</h2>
        <span className="text-xs text-muted">vs. presupuesto y promedio de 3 meses</span>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">Todavía no hay gastos este mes.</p>
      ) : (
        <ul className="space-y-4">
          {lines.map((l, i) => (
            <li key={l.category} className="reveal space-y-1.5" style={{ "--i": i } as React.CSSProperties}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{label(l.category)}</span>
                  {l.anomaly && (
                    <span className="chip shrink-0 border-warn/30 bg-warn/10 text-warn">
                      <TrendingUp className="h-3 w-3" aria-hidden="true" /> Más que lo usual
                    </span>
                  )}
                </span>
                <span className={cn("num shrink-0", l.overBudget ? "font-semibold text-danger" : "text-muted")}>
                  {formatMoney(l.spent)}
                  {l.budget !== null && <span className="text-faint"> / {formatMoney(l.budget)}</span>}
                </span>
              </div>
              <div className="track relative h-2.5">
                <div
                  className={cn("bar-fill", l.overBudget ? "bg-danger" : "bg-gradient-to-r from-accent to-accent-2")}
                  style={{ width: `${(l.spent / max) * 100}%`, animationDelay: `${i * 60}ms` }}
                />
                {l.budget !== null && (
                  <span className="absolute inset-y-0 w-0.5 bg-ink/60" style={{ left: `${(l.budget / max) * 100}%` }} title="Presupuesto" aria-hidden="true" />
                )}
              </div>
              {l.avg3m > 0 && <p className="text-xs text-faint">Promedio: <span className="num">{formatMoney(l.avg3m)}</span></p>}
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={setBudget} submitLabel="Fijar Presupuesto" className="flex flex-wrap items-end gap-2 space-y-0 border-t pt-5">
        <label className="field min-w-[10rem] flex-1">
          Categoría
          <select name="category" className="input">
            {CATEGORY_KEYS.filter((c) => !CATEGORIES[c].income).map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field min-w-[10rem] flex-1">
          Límite mensual (ARS)
          <input name="monthlyLimit" type="number" inputMode="numeric" min={1} placeholder="150000…" required autoComplete="off" className="input num" />
        </label>
      </ActionForm>
    </section>
  );
}
