import Link from "next/link";
import { CategoryTable } from "@/components/category-table";
import { GoalForm, InvestorProfileForm, TransactionForm } from "@/components/finance-forms";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { InvestmentPlan } from "@/components/investment-plan";
import { SummaryCards } from "@/components/summary-cards";
import { shiftMonth } from "@/lib/budget";
import { CATEGORIES, type Category } from "@/lib/categories";
import { loadFinance } from "@/lib/load";
import { formatMoney } from "@/lib/money";
import { monthParamSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";

const MP_MESSAGES: Record<string, string> = {
  ok: "Mercado Pago conectado y sincronizado.",
  error: "No pudimos conectar Mercado Pago. Probá de nuevo.",
  invalid_state: "La conexión con Mercado Pago expiró o no es válida. Probá de nuevo.",
};

export default async function FinanceDashboard({ searchParams }: { searchParams: { m?: string; mp?: string } }) {
  const { supabase } = await requireUser();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const requested = monthParamSchema.safeParse(searchParams.m);
  const month = requested.success ? requested.data : today.slice(0, 7);
  const data = await loadFinance(supabase, month, today);

  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold capitalize">{monthLabel}</h1>
          <p className="text-sm text-neutral-500">Gastos, ingresos e inversiones en un solo lugar</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link className="rounded-md border px-3 py-1.5" href={`/?m=${shiftMonth(month, -1)}`}>← Anterior</Link>
          <Link className="rounded-md border px-3 py-1.5" href="/">Este mes</Link>
          <Link className="rounded-md border px-3 py-1.5" href={`/?m=${shiftMonth(month, 1)}`}>Siguiente →</Link>
        </nav>
      </header>

      {searchParams.mp && MP_MESSAGES[searchParams.mp] && (
        <p className="rounded-md border px-3 py-2 text-sm">{MP_MESSAGES[searchParams.mp]}</p>
      )}

      <SummaryCards summary={data.summary} portfolioArs={data.portfolioArs} />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {data.plan ? (
            <InvestmentPlan plan={data.plan} />
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-sm text-neutral-500">
              Completá tu perfil de inversor y cargá tus ingresos para recibir un plan de inversión.
            </p>
          )}
          <CategoryTable lines={data.summary.byCategory} />
          <section className="rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-2 font-semibold">Movimientos del mes</h2>
            <table className="w-full text-sm">
              <tbody>
                {data.recent.map((t) => (
                  <tr key={t.id} className="border-t dark:border-neutral-800">
                    <td className="py-1.5 text-neutral-500">{t.date.slice(8)}/{t.date.slice(5, 7)}</td>
                    <td className="py-1.5">
                      {t.description || CATEGORIES[t.category as Category]?.label}
                      {t.source !== "manual" && <span className="ml-1 text-xs text-neutral-400">· {t.source}</span>}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums ${t.amount < 0 ? "" : "text-emerald-600"}`}>
                      {formatMoney(t.amount, t.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-6">
          <TransactionForm today={today} />
          <IntegrationsPanel integrations={data.integrations} positions={data.positions} />
          <InvestorProfileForm defaults={data.profile} />
          <GoalForm />
        </aside>
      </div>
    </div>
  );
}
