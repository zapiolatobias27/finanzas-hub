import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Sprout } from "lucide-react";
import Link from "next/link";
import { CategoryTable } from "@/components/category-table";
import { GoalForm, InvestorProfileForm, TransactionForm } from "@/components/finance-forms";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { InvestmentPlan } from "@/components/investment-plan";
import { MonthlyEvolution } from "@/components/monthly-evolution";
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

  const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));

  const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow reveal">Resumen mensual</p>
          <h1 className="reveal font-display text-4xl font-semibold tracking-tight first-letter:uppercase md:text-5xl" style={delay(1)}>
            {monthLabel}
          </h1>
        </div>
        <nav className="reveal flex items-center gap-1 rounded-xl border bg-surface p-1 text-sm" style={delay(2)} aria-label="Cambiar de mes">
          <Link className="btn h-8 w-8 p-0 hover:bg-surface-2" href={`/?m=${shiftMonth(month, -1)}`} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link className="btn px-3 py-1 hover:bg-surface-2" href="/">Este mes</Link>
          <Link className="btn h-8 w-8 p-0 hover:bg-surface-2" href={`/?m=${shiftMonth(month, 1)}`} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      {searchParams.mp && MP_MESSAGES[searchParams.mp] && (
        <p className="animate-pop rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm" role="status">
          {MP_MESSAGES[searchParams.mp]}
        </p>
      )}

      <SummaryCards
        summary={data.summary}
        portfolioArs={data.portfolioArs}
        inProgress={
          month === today.slice(0, 7)
            ? {
                day: Number(today.slice(8)),
                days: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate(),
                avgExpenses: data.averages && data.averages.months > 0 ? data.averages.expenses : null,
              }
            : undefined
        }
      />

      <div className="reveal" style={delay(3)}>
        <MonthlyEvolution history={data.history} current={month} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="reveal" style={delay(4)}>
            {data.plan ? (
              <InvestmentPlan plan={data.plan} />
            ) : (
              <div className="card flex flex-col items-center gap-3 p-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent" aria-hidden="true">
                  <Sprout className="h-6 w-6" />
                </span>
                <h2 className="font-display text-xl font-semibold">Tu plan de inversión aparece acá</h2>
                <p className="max-w-sm text-sm text-muted">Completá tu perfil de inversor y cargá tus ingresos y gastos para recibir un plan mensual.</p>
              </div>
            )}
          </div>
          <div className="reveal" style={delay(5)}>
            <CategoryTable lines={data.summary.byCategory} />
          </div>
          <section className="card reveal p-6" style={delay(6)}>
            <h2 className="mb-3 font-display text-lg font-semibold">Movimientos del mes</h2>
            {data.recent.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">Sin movimientos todavía.</p>
            ) : (
              <ul className="divide-y">
                {data.recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.amount < 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}
                      aria-hidden="true"
                    >
                      {t.amount < 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.description || CATEGORIES[t.category as Category]?.label}</span>
                      <span className="block text-xs text-muted">
                        {CATEGORIES[t.category as Category]?.label} · {dayFmt.format(new Date(`${t.date}T12:00:00Z`))}
                        {t.source !== "manual" && ` · ${t.source === "mercadopago" ? "Mercado Pago" : "IOL"}`}
                      </span>
                    </span>
                    <span className={`num shrink-0 font-semibold ${t.amount < 0 ? "" : "text-success"}`}>{formatMoney(t.amount, t.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="reveal" style={delay(4)}>
            <TransactionForm today={today} />
          </div>
          <div className="reveal" style={delay(5)}>
            <IntegrationsPanel integrations={data.integrations} positions={data.positions} />
          </div>
          <div className="reveal" style={delay(6)}>
            <InvestorProfileForm defaults={data.profile} />
          </div>
          <div className="reveal" style={delay(7)}>
            <GoalForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
