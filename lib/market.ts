import "server-only";
import { z } from "zod";
import { ERC20_TOKENS, type Chain } from "./assets";
import type { Quote } from "./networth";

// Fuentes públicas y gratuitas. Next cachea cada respuesta unos segundos (`revalidate`), así
// muchos usuarios comparten la misma consulta y no superamos los límites de las APIs.
// Si una fuente falla, devolvemos lo que haya: la pantalla muestra el resto y marca lo faltante.

export const PRICE_TTL_SECONDS = 60;
const BALANCE_TTL_SECONDS = 300;
const ETH_RPC = "https://ethereum-rpc.publicnode.com";

async function getJson(url: string, revalidate = PRICE_TTL_SECONDS, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, next: { revalidate } });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res.json();
}

/* ───────── Dólar ───────── */

const dolarSchema = z.array(
  z.object({ casa: z.string(), compra: z.number().nullable(), venta: z.number().nullable(), fechaActualizacion: z.string() }),
);

export interface FxRates {
  mep: number;
  blue: number | null;
  oficial: number | null;
  ccl: number | null;
  updatedAt: string;
}

export async function getFxRates(): Promise<FxRates | null> {
  try {
    const data = dolarSchema.parse(await getJson("https://dolarapi.com/v1/dolares"));
    const venta = (casa: string) => data.find((d) => d.casa === casa)?.venta ?? null;
    const mep = venta("bolsa");
    if (!mep) return null;
    return {
      mep,
      blue: venta("blue"),
      oficial: venta("oficial"),
      ccl: venta("contadoconliqui"),
      updatedAt: data.map((d) => d.fechaActualizacion).sort().at(-1) ?? new Date().toISOString(),
    };
  } catch (e) {
    console.error("[market] dólar", e);
    return null;
  }
}

/* ───────── BYMA: CEDEARs y acciones ───────── */

const bymaSchema = z.array(z.object({ symbol: z.string(), c: z.number().nullable(), pct_change: z.number().nullable() }));

export type BymaQuotes = Map<string, Quote & { kind: "cedear" | "accion" }>;

export async function getBymaQuotes(): Promise<BymaQuotes> {
  const map: BymaQuotes = new Map();
  const sources = [
    { kind: "accion" as const, url: "https://data912.com/live/arg_stocks" },
    { kind: "cedear" as const, url: "https://data912.com/live/arg_cedears" },
  ];
  await Promise.all(
    sources.map(async ({ kind, url }) => {
      try {
        for (const r of bymaSchema.parse(await getJson(url))) {
          if (r.c && r.c > 0) map.set(r.symbol, { price: r.c, changePct: r.pct_change, kind });
        }
      } catch (e) {
        console.error("[market] byma", kind, e);
      }
    }),
  );
  return map;
}

/* ───────── Cripto ───────── */

const geckoSchema = z.record(z.object({ usd: z.number(), usd_24h_change: z.number().nullable().optional() }));

export async function getCryptoQuotes(ids: string[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(ids)].sort();
  if (!unique.length) return {};
  try {
    const params = new URLSearchParams({ ids: unique.join(","), vs_currencies: "usd", include_24hr_change: "true" });
    const data = geckoSchema.parse(await getJson(`https://api.coingecko.com/api/v3/simple/price?${params}`));
    return Object.fromEntries(Object.entries(data).map(([id, q]) => [id, { price: q.usd, changePct: q.usd_24h_change ?? null }]));
  } catch (e) {
    console.error("[market] cripto", e);
    return {};
  }
}

/* ───────── Saldos de billeteras (solo lectura, dirección pública) ───────── */

export interface WalletBalance {
  symbol: string;
  amount: number;
}

const mempoolSchema = z.object({
  chain_stats: z.object({ funded_txo_sum: z.number(), spent_txo_sum: z.number() }),
  mempool_stats: z.object({ funded_txo_sum: z.number(), spent_txo_sum: z.number() }),
});
const rpcSchema = z.object({ result: z.string().regex(/^0x[0-9a-fA-F]*$/) });

const fromUnits = (hex: string, decimals: number) => Number(BigInt(hex === "0x" ? "0x0" : hex)) / 10 ** decimals;

async function ethRpc(method: string, params: unknown[]): Promise<string> {
  const data = await getJson(ETH_RPC, BALANCE_TTL_SECONDS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return rpcSchema.parse(data).result;
}

export async function getWalletBalances(chain: Chain, address: string): Promise<WalletBalance[] | null> {
  try {
    if (chain === "bitcoin") {
      const d = mempoolSchema.parse(await getJson(`https://mempool.space/api/address/${address}`, BALANCE_TTL_SECONDS));
      const sats = d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum + d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum;
      return [{ symbol: "BTC", amount: sats / 1e8 }];
    }
    const owner = address.slice(2).toLowerCase().padStart(64, "0");
    const [eth, ...tokens] = await Promise.all([
      ethRpc("eth_getBalance", [address, "latest"]),
      ...ERC20_TOKENS.map((t) => ethRpc("eth_call", [{ to: t.contract, data: `0x70a08231${owner}` }, "latest"])),
    ]);
    return [
      { symbol: "ETH", amount: fromUnits(eth, 18) },
      ...ERC20_TOKENS.map((t, i) => ({ symbol: t.symbol, amount: fromUnits(tokens[i], t.decimals) })),
    ].filter((b) => b.amount > 0);
  } catch (e) {
    console.error("[market] wallet", chain, e);
    return null;
  }
}
