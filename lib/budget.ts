import type { Currency } from "./money";
import { toARS } from "./money";

export interface Tx {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  source: "manual" | "mercadopago" | "iol";
}

export interface CategoryLine {
  category: string;
  spent: number;
  budget: number | null;
  /** Promedio de los 3 meses anteriores */
  avg3m: number;
  overBudget: boolean;
  /** Gasto inusualmente alto respecto del histórico */
  anomaly: boolean;
}

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  byCategory: CategoryLine[];
}

const ANOMALY_FACTOR = 1.3;
const ANOMALY_MIN_ARS = 10_000;

export const monthOf = (date: string) => date.slice(0, 7);

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function expensesByCategory(txs: Tx[], month: string, usdArs: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0 || monthOf(t.date) !== month) continue;
    map.set(t.category, (map.get(t.category) ?? 0) - toARS(t.amount, t.currency, usdArs));
  }
  return map;
}

/** Resumen mensual consolidado en ARS, con presupuesto y detección de desvíos. */
export function monthSummary(txs: Tx[], month: string, budgets: Record<string, number>, usdArs: number): MonthSummary {
  const inMonth = txs.filter((t) => monthOf(t.date) === month);
  const income = inMonth.filter((t) => t.amount > 0).reduce((s, t) => s + toARS(t.amount, t.currency, usdArs), 0);
  const expenses = inMonth.filter((t) => t.amount < 0).reduce((s, t) => s - toARS(t.amount, t.currency, usdArs), 0);

  const current = expensesByCategory(txs, month, usdArs);
  const history = [1, 2, 3].map((n) => expensesByCategory(txs, shiftMonth(month, -n), usdArs));
  const categories = new Set([...current.keys(), ...Object.keys(budgets)]);

  const byCategory = [...categories]
    .map((category) => {
      const spent = current.get(category) ?? 0;
      const avg3m = history.reduce((s, h) => s + (h.get(category) ?? 0), 0) / 3;
      const budget = budgets[category] ?? null;
      return {
        category,
        spent,
        budget,
        avg3m,
        overBudget: budget !== null && spent > budget,
        anomaly: avg3m > 0 && spent > avg3m * ANOMALY_FACTOR && spent - avg3m > ANOMALY_MIN_ARS,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return { month, income, expenses, net: income - expenses, savingsRate: income > 0 ? (income - expenses) / income : 0, byCategory };
}

/** Promedios mensuales de ingresos y gastos de los últimos `months` meses completos. */
export function monthlyAverages(txs: Tx[], currentMonth: string, usdArs: number, months = 3) {
  let income = 0;
  let expenses = 0;
  let counted = 0;
  for (let n = 1; n <= months; n++) {
    const s = monthSummary(txs, shiftMonth(currentMonth, -n), {}, usdArs);
    if (s.income === 0 && s.expenses === 0) continue;
    income += s.income;
    expenses += s.expenses;
    counted++;
  }
  return counted ? { income: income / counted, expenses: expenses / counted, months: counted } : null;
}
