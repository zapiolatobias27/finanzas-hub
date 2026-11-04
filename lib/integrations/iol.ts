import "server-only";
import { z } from "zod";

// Cliente de solo lectura para la API v2 de InvertirOnline.
// Requisito: el usuario tiene que tener habilitado el acceso a la API en su cuenta de IOL.
// La contraseña se usa una única vez para obtener tokens y NUNCA se guarda.

const IOL_BASE = "https://api.invertironline.com";

const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
export type IolToken = z.infer<typeof tokenSchema>;

const currencySchema = z.string().transform((m) => (m.toLowerCase().includes("dolar") ? ("USD" as const) : ("ARS" as const)));

const portfolioSchema = z.object({
  activos: z.array(
    z.object({
      cantidad: z.number(),
      ultimoPrecio: z.number().nullable().optional(),
      valorizado: z.number(),
      titulo: z.object({
        simbolo: z.string(),
        descripcion: z.string().nullable().optional(),
        tipo: z.string().nullable().optional(),
        moneda: currencySchema,
      }),
    }),
  ),
});

const accountStatusSchema = z.object({
  cuentas: z.array(
    z.object({
      numero: z.string().optional(),
      tipo: z.string(),
      moneda: currencySchema,
      disponible: z.number(),
      total: z.number(),
    }),
  ),
});

export type IolPosition = {
  symbol: string;
  description: string | null;
  type: string | null;
  quantity: number;
  lastPrice: number | null;
  valuation: number;
  currency: "ARS" | "USD";
};

async function requestToken(body: Record<string, string>): Promise<IolToken> {
  const res = await fetch(`${IOL_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.status === 400 ? "Usuario o contraseña de IOL incorrectos" : `IOL respondió ${res.status}`);
  return tokenSchema.parse(await res.json());
}

export function iolLogin(username: string, password: string) {
  return requestToken({ grant_type: "password", username, password });
}

export function iolRefresh(refreshToken: string) {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function iolGet(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${IOL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`IOL ${path} respondió ${res.status}`);
  return res.json();
}

export async function getPortfolio(accessToken: string, country: "argentina" | "estados_Unidos" = "argentina"): Promise<IolPosition[]> {
  const data = portfolioSchema.parse(await iolGet(`/api/v2/portafolio/${country}`, accessToken));
  return data.activos.map((a) => ({
    symbol: a.titulo.simbolo,
    description: a.titulo.descripcion ?? null,
    type: a.titulo.tipo ?? null,
    quantity: a.cantidad,
    lastPrice: a.ultimoPrecio ?? null,
    valuation: a.valorizado,
    currency: a.titulo.moneda,
  }));
}

export async function getAccountStatus(accessToken: string) {
  return accountStatusSchema.parse(await iolGet("/api/v2/estadocuenta", accessToken)).cuentas;
}
