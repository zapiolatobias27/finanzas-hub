import "server-only";
import { guessCategory } from "../categories";
import { decrypt, encrypt } from "../crypto";
import { createServiceClient } from "../supabase/server";
import { getPortfolio, iolRefresh } from "./iol";
import { refreshMpToken, searchPayments } from "./mercadopago";

// La tabla `integrations` no tiene policies: se accede solo con service role y SIEMPRE filtrando por userId.
type Provider = "mercadopago" | "iol";

interface IntegrationRow {
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string | null;
  external_user_id: string | null;
}

const EXPIRY_MARGIN_MS = 60_000;

export async function saveIntegration(
  userId: string,
  provider: Provider,
  token: { access_token: string; refresh_token: string; expires_in: number },
  externalUserId?: string,
) {
  const db = createServiceClient();
  const { error } = await db.from("integrations").upsert({
    user_id: userId,
    provider,
    access_token_enc: encrypt(token.access_token),
    refresh_token_enc: encrypt(token.refresh_token),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    ...(externalUserId ? { external_user_id: externalUserId } : {}),
    status: "active",
  });
  if (error) throw error;
}

/** Devuelve un access token vigente, refrescándolo si está por vencer. */
async function validToken(userId: string, provider: Provider): Promise<{ accessToken: string; externalUserId: string | null } | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("integrations")
    .select("access_token_enc, refresh_token_enc, expires_at, external_user_id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle<IntegrationRow>();
  if (!data) return null;

  const expired = data.expires_at && new Date(data.expires_at).getTime() - EXPIRY_MARGIN_MS < Date.now();
  if (!expired) return { accessToken: decrypt(data.access_token_enc), externalUserId: data.external_user_id };
  if (!data.refresh_token_enc) return null;

  try {
    const refresh = decrypt(data.refresh_token_enc);
    const token = provider === "iol" ? await iolRefresh(refresh) : await refreshMpToken(refresh);
    await saveIntegration(userId, provider, token);
    return { accessToken: token.access_token, externalUserId: data.external_user_id };
  } catch {
    // Refresh vencido o revocado: hay que reconectar.
    await db.from("integrations").update({ status: "reconnect" }).eq("user_id", userId).eq("provider", provider);
    return null;
  }
}

async function markSynced(userId: string, provider: Provider) {
  await createServiceClient()
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
}

/** Importa pagos aprobados de los últimos `days` días como transacciones (idempotente). */
export async function syncMercadoPago(userId: string, days = 60): Promise<number> {
  const auth = await validToken(userId, "mercadopago");
  if (!auth?.externalUserId) return 0;

  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const [incoming, outgoing] = await Promise.all([
    searchPayments(auth.accessToken, { from, to, role: "in", mpUserId: auth.externalUserId }),
    searchPayments(auth.accessToken, { from, to, role: "out", mpUserId: auth.externalUserId }),
  ]);

  const rows = [
    ...incoming.map((p) => ({ p, sign: 1 })),
    ...outgoing.map((p) => ({ p, sign: -1 })),
  ]
    .filter(({ p }) => p.currency_id === "ARS" || p.currency_id === "USD")
    .map(({ p, sign }) => ({
      user_id: userId,
      occurred_on: (p.date_approved ?? p.date_created).slice(0, 10),
      amount: sign * p.transaction_amount,
      currency: p.currency_id,
      description: p.description ?? "Mercado Pago",
      category: sign > 0 ? "sueldo" : guessCategory(p.description ?? ""),
      source: "mercadopago",
      external_id: `${sign > 0 ? "in" : "out"}:${p.id}`,
    }));

  if (rows.length) {
    // ignoreDuplicates: si el usuario recategorizó un movimiento, no lo pisamos.
    const { error } = await createServiceClient()
      .from("transactions")
      .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  await markSynced(userId, "mercadopago");
  return rows.length;
}

/** Reemplaza la foto del portafolio de IOL. */
export async function syncIol(userId: string): Promise<number> {
  const auth = await validToken(userId, "iol");
  if (!auth) return 0;

  const positions = await getPortfolio(auth.accessToken);
  const db = createServiceClient();
  const { error: delError } = await db.from("portfolio_positions").delete().eq("user_id", userId).eq("provider", "iol");
  if (delError) throw delError;
  if (positions.length) {
    const { error } = await db.from("portfolio_positions").insert(
      positions.map((p) => ({
        user_id: userId,
        provider: "iol",
        symbol: p.symbol,
        description: p.description,
        instrument_type: p.type,
        quantity: p.quantity,
        last_price: p.lastPrice,
        valuation: p.valuation,
        currency: p.currency,
      })),
    );
    if (error) throw error;
  }
  await markSynced(userId, "iol");
  return positions.length;
}
