"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getBymaQuotes } from "@/lib/market";
import { positionSchema, walletSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";

const done = (message: string): ActionResult => {
  revalidatePath("/patrimonio");
  return { ok: true, message };
};

export async function addWallet(formData: FormData): Promise<ActionResult> {
  const parsed = walletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const w = parsed.data;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("crypto_wallets").insert({ chain: w.chain, address: w.address, label: w.label || null });
  if (error) return { ok: false, message: error.code === "23505" ? "Esa billetera ya está agregada." : error.message };
  return done("Billetera agregada. El saldo se lee de la blockchain.");
}

export async function addPosition(formData: FormData): Promise<ActionResult> {
  const parsed = positionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const p = parsed.data;

  // Validamos que el ticker cotice en BYMA para no guardar algo que nunca va a tener precio.
  if (p.kind !== "cripto") {
    const quote = (await getBymaQuotes()).get(p.symbol);
    if (!quote) return { ok: false, message: `No encontramos ${p.symbol} en BYMA. Revisá el ticker (ej: SPY, AAPL, GGAL).` };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("manual_positions")
    .upsert({ kind: p.kind, symbol: p.symbol, quantity: p.quantity, avg_price: p.avgPrice ?? null }, { onConflict: "user_id,kind,symbol" });
  if (error) return { ok: false, message: error.message };
  return done(`${p.symbol} guardado.`);
}

export async function deleteWallet(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("crypto_wallets").delete().eq("id", id);
  revalidatePath("/patrimonio");
}

export async function deletePosition(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("manual_positions").delete().eq("id", id);
  revalidatePath("/patrimonio");
}
