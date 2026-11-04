import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInvestmentPlan, type InvestmentPlan } from "./advisor";
import { monthlyAverages, monthSummary, shiftMonth, type MonthSummary, type Tx } from "./budget";
import { getFxRates } from "./market";
import { toARS, type Currency } from "./money";

export interface Position {
  symbol: string;
  description: string | null;
  type: string | null;
  quantity: number;
  valuation: number;
  currency: Currency;
}

export interface FinanceData {
  month: string;
  summary: MonthSummary;
  recent: Tx[];
  plan: InvestmentPlan | null;
  averages: { income: number; expenses: number; months: number } | null;
  positions: Position[];
  portfolioArs: number;
  integrations: { provider: string; status: string; last_sync_at: string | null }[];
  profile: { riskTolerance: number; emergencyMonths: number; emergencySaved: number; usdArs: number } | null;
  /** Dólar usado para consolidar: MEP en vivo, o el del perfil si dolarapi no responde. */
  usdArs: number;
  usdArsLive: boolean;
  /** Últimos 6 meses, del más viejo al actual. */
  history: { month: string; income: number; expenses: number }[];
}

export async function loadFinance(supabase: SupabaseClient, month: string, today: string): Promise<FinanceData> {
  const since = `${shiftMonth(month, -5)}-01`;
  const [txRes, budgetRes, goalRes, profileRes, posRes, intRes, fx] = await Promise.all([
    supabase.from("transactions").select("*").gte("occurred_on", since).order("occurred_on", { ascending: false }).limit(5000),
    supabase.from("budgets").select("category, monthly_limit"),
    supabase.from("financial_goals").select("*").order("priority", { ascending: false }),
    supabase.from("investor_profiles").select("*").maybeSingle(),
    supabase.from("portfolio_positions").select("*").order("valuation", { ascending: false }),
    supabase.rpc("my_integrations"),
    getFxRates(),
  ]);

  const p = profileRes.data;
  const profile = p
    ? {
        riskTolerance: p.risk_tolerance,
        emergencyMonths: p.emergency_months,
        emergencySaved: Number(p.emergency_saved),
        usdArs: Number(p.usd_ars_rate),
      }
    : null;
  const usdArs = fx?.mep ?? profile?.usdArs ?? 1000;

  const txs: Tx[] = (txRes.data ?? []).map((r) => ({
    id: r.id,
    date: r.occurred_on,
    amount: Number(r.amount),
    currency: r.currency,
    category: r.category,
    description: r.description,
    source: r.source,
  }));
  const budgets = Object.fromEntries((budgetRes.data ?? []).map((b) => [b.category, Number(b.monthly_limit)]));
  const summary = monthSummary(txs, month, budgets, usdArs);
  // Sin historial todavía: usamos el mes en curso como estimación.
  const averages =
    monthlyAverages(txs, month, usdArs) ??
    (summary.income > 0 ? { income: summary.income, expenses: summary.expenses, months: 0 } : null);

  const plan =
    profile && averages
      ? buildInvestmentPlan({
          today,
          avgMonthlyIncome: averages.income,
          avgMonthlyExpenses: averages.expenses,
          emergencySaved: profile.emergencySaved,
          emergencyMonths: profile.emergencyMonths,
          riskTolerance: profile.riskTolerance,
          usdArs,
          goals: (goalRes.data ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            target: Number(g.target_amount),
            saved: Number(g.saved_amount),
            currency: g.currency,
            deadline: g.deadline,
            priority: g.priority,
          })),
        })
      : null;

  const positions: Position[] = (posRes.data ?? []).map((r) => ({
    symbol: r.symbol,
    description: r.description,
    type: r.instrument_type,
    quantity: Number(r.quantity),
    valuation: Number(r.valuation),
    currency: r.currency,
  }));

  return {
    month,
    summary,
    recent: txs.filter((t) => t.date.startsWith(month)).slice(0, 30),
    plan,
    averages,
    positions,
    portfolioArs: positions.reduce((s, p) => s + toARS(p.valuation, p.currency, usdArs), 0),
    integrations: intRes.data ?? [],
    profile,
    usdArs,
    usdArsLive: Boolean(fx),
    history: [5, 4, 3, 2, 1, 0].map((n) => {
      const m = shiftMonth(month, -n);
      const s = monthSummary(txs, m, {}, usdArs);
      return { month: m, income: s.income, expenses: s.expenses };
    }),
  };
}
