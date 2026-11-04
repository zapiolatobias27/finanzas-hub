"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { iolLogin } from "@/lib/integrations/iol";
import { saveIntegration, syncIol, syncMercadoPago } from "@/lib/integrations/sync";
import { budgetSchema, goalSchema, investorProfileSchema, iolCredentialsSchema, transactionSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";

const done = (message?: string): ActionResult => {
  revalidatePath("/");
  return { ok: true, message };
};

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const t = parsed.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").insert({
    occurred_on: t.date,
    amount: t.kind === "expense" ? -t.amount : t.amount,
    currency: t.currency,
    category: t.category,
    description: t.description,
  });
  if (error) return { ok: false, message: error.message };
  return done();
}

export async function setBudget(formData: FormData): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: user.id, category: parsed.data.category, monthly_limit: parsed.data.monthlyLimit });
  if (error) return { ok: false, message: error.message };
  return done("Presupuesto guardado");
}

export async function addGoal(formData: FormData): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const g = parsed.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("financial_goals").insert({
    name: g.name,
    target_amount: g.targetAmount,
    saved_amount: g.savedAmount,
    currency: g.currency,
    deadline: g.deadline,
    priority: g.priority,
  });
  if (error) return { ok: false, message: error.message };
  return done("Objetivo creado");
}

export async function saveInvestorProfile(formData: FormData): Promise<ActionResult> {
  const parsed = investorProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const p = parsed.data;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("investor_profiles").upsert({
    user_id: user.id,
    risk_tolerance: p.riskTolerance,
    emergency_months: p.emergencyMonths,
    emergency_saved: p.emergencySaved,
    usd_ars_rate: p.usdArsRate,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };
  return done("Perfil guardado");
}

/** Intercambia usuario/contraseña de IOL por tokens. La contraseña no se persiste ni se loguea. */
export async function connectIol(formData: FormData): Promise<ActionResult> {
  const parsed = iolCredentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  const { user } = await requireUser();
  try {
    const token = await iolLogin(parsed.data.username, parsed.data.password);
    await saveIntegration(user.id, "iol", token);
    const n = await syncIol(user.id);
    return done(`IOL conectado: ${n} posiciones sincronizadas`);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se pudo conectar con IOL" };
  }
}

export async function syncAll(): Promise<void> {
  const { user } = await requireUser();
  await Promise.allSettled([syncMercadoPago(user.id), syncIol(user.id)]);
  revalidatePath("/");
}
