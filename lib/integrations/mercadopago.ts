import "server-only";
import { z } from "zod";

// Integración OAuth con Mercado Pago (solo lectura de pagos).
// Limitación: la API pública de MP está orientada a vendedores. Expone los pagos donde el usuario
// es cobrador (ingresos) o pagador con su cuenta MP; no todos los consumos con tarjeta o
// transferencias aparecen. Lo que falte se carga manualmente.

const AUTH_BASE = "https://auth.mercadopago.com.ar";
const API_BASE = "https://api.mercadopago.com";

function config() {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = process.env.MP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Faltan MP_CLIENT_ID / MP_CLIENT_SECRET / MP_REDIRECT_URI");
  return { clientId, clientSecret, redirectUri };
}

const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  user_id: z.union([z.number(), z.string()]).transform(String),
});
export type MpToken = z.infer<typeof tokenSchema>;

const paymentSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  date_approved: z.string().nullable(),
  date_created: z.string(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  description: z.string().nullable().optional(),
});
const searchSchema = z.object({
  results: z.array(paymentSchema),
  paging: z.object({ total: z.number(), offset: z.number(), limit: z.number() }),
});
export type MpPayment = z.infer<typeof paymentSchema>;

export function authorizationUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: redirectUri,
  });
  return `${AUTH_BASE}/authorization?${params}`;
}

async function requestToken(body: Record<string, string>): Promise<MpToken> {
  const { clientId, clientSecret } = config();
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago OAuth respondió ${res.status}`);
  return tokenSchema.parse(await res.json());
}

export function exchangeCode(code: string) {
  return requestToken({ grant_type: "authorization_code", code, redirect_uri: config().redirectUri });
}

export function refreshMpToken(refreshToken: string) {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Pagos aprobados en el rango, como cobrador ("in") o como pagador ("out"). Pagina hasta 1000. */
export async function searchPayments(
  accessToken: string,
  opts: { from: Date; to: Date; role: "in" | "out"; mpUserId: string },
): Promise<MpPayment[]> {
  const out: MpPayment[] = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const params = new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      range: "date_created",
      begin_date: opts.from.toISOString(),
      end_date: opts.to.toISOString(),
      status: "approved",
      limit: "100",
      offset: String(offset),
    });
    if (opts.role === "out") params.set("payer.id", opts.mpUserId);
    const res = await fetch(`${API_BASE}/v1/payments/search?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Mercado Pago payments/search respondió ${res.status}`);
    const page = searchSchema.parse(await res.json());
    out.push(...page.results);
    if (offset + page.results.length >= page.paging.total || page.results.length === 0) break;
  }
  return out;
}
