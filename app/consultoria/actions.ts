"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { buildPlan } from "@/lib/consulting/engine";
import { consultAnswersSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";

/** Calcula el plan por reglas (instantáneo) y lo guarda; la explicación con IA se genera al ver el resultado. */
export async function createConsultation(answers: unknown): Promise<ActionResult> {
  const parsed = consultAnswersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  const { supabase } = await requireUser();
  const plan = buildPlan(parsed.data);
  const { data, error } = await supabase.from("consultations").insert({ answers: parsed.data, plan }).select("id").single();
  if (error) return { ok: false, message: error.message };
  redirect(`/consultoria/${data.id}`);
}
