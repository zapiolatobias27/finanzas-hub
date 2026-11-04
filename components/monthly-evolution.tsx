import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const monthFmt = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });

/** Barras de ingresos vs. gastos de los últimos 6 meses, con el ahorro de cada mes. */
export function MonthlyEvolution({ history, current }: { history: { month: string; income: number; expenses: number }[]; current: string }) {
  const max = Math.max(1, ...history.flatMap((h) => [h.income, h.expenses]));
  const withData = history.filter((h) => h.income || h.expenses);

  return (
    <section className="card space-y-5 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Evolución mensual</h2>
        <ul className="flex gap-4 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> Ingresos
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger/70" aria-hidden="true" /> Gastos
          </li>
        </ul>
      </div>

      {withData.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">Cargá movimientos para ver cómo evolucionan mes a mes.</p>
      ) : (
        <ol className="grid h-56 grid-cols-6 items-end gap-3" aria-label="Ingresos y gastos de los últimos 6 meses">
          {history.map((h, i) => {
            const net = h.income - h.expenses;
            const label = monthFmt.format(new Date(`${h.month}-15T12:00:00Z`));
            return (
              <li key={h.month} className="flex h-full flex-col items-center gap-2">
                <span className={cn("num text-[11px]", !h.income && !h.expenses ? "text-transparent" : net >= 0 ? "text-success" : "text-danger")}>
                  {net >= 0 ? "+" : ""}
                  {Math.round(net / 1000).toLocaleString("es-AR")}k
                </span>
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  {[
                    { v: h.income, c: "bg-accent", t: "Ingresos" },
                    { v: h.expenses, c: "bg-danger/70", t: "Gastos" },
                  ].map((b) => (
                    <div
                      key={b.t}
                      title={`${b.t} ${label}: ${formatMoney(b.v)}`}
                      className={cn("bar-grow w-full max-w-5 rounded-t-md", b.c)}
                      style={{ height: `${(b.v / max) * 100}%`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <span className={cn("text-xs capitalize", h.month === current ? "font-semibold text-ink" : "text-muted")}>{label.replace(".", "")}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
