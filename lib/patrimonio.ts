import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHAIN_LABEL, CRYPTO_IDS, shortAddress, type AssetKind, type Chain } from "./assets";
import { getBymaQuotes, getCryptoQuotes, getFxRates, getWalletBalances, type FxRates } from "./market";
import type { Currency } from "./money";
import { valueHoldings, type Holding, type NetWorth } from "./networth";

export interface WalletRow {
  id: string;
  chain: Chain;
  address: string;
  label: string | null;
  /** null = no se pudo leer la blockchain en este momento. */
  balances: { symbol: string; amount: number }[] | null;
}

export interface PositionRow {
  id: string;
  kind: AssetKind;
  symbol: string;
  quantity: number;
  avgPrice: number | null;
}

export interface Snapshot {
  day: string;
  totalArs: number;
  totalUsd: number;
}

export interface PatrimonioData {
  fx: FxRates | null;
  mep: number;
  netWorth: NetWorth;
  wallets: WalletRow[];
  positions: PositionRow[];
  snapshots: Snapshot[];
  /** Cuándo se consultaron las cotizaciones (para el indicador "en vivo"). */
  fetchedAt: string;
}

/** MEP de respaldo si dolarapi no responde: el que el usuario cargó en su perfil. */
async function fallbackMep(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("investor_profiles").select("usd_ars_rate").maybeSingle();
  return Number(data?.usd_ars_rate ?? 1000);
}

export async function loadPatrimonio(supabase: SupabaseClient, userId: string, today: string): Promise<PatrimonioData> {
  const [walletRes, positionRes, iolRes, fx, byma] = await Promise.all([
    supabase.from("crypto_wallets").select("id, chain, address, label").order("created_at"),
    supabase.from("manual_positions").select("id, kind, symbol, quantity, avg_price").order("created_at"),
    supabase.from("portfolio_positions").select("symbol, description, instrument_type, quantity, valuation, currency"),
    getFxRates(),
    getBymaQuotes(),
  ]);
  const mep = fx?.mep ?? (await fallbackMep(supabase));

  const wallets: WalletRow[] = await Promise.all(
    (walletRes.data ?? []).map(async (w) => ({
      id: w.id,
      chain: w.chain as Chain,
      address: w.address,
      label: w.label,
      balances: await getWalletBalances(w.chain as Chain, w.address),
    })),
  );
  const positions: PositionRow[] = (positionRes.data ?? []).map((p) => ({
    id: p.id,
    kind: p.kind,
    symbol: p.symbol,
    quantity: Number(p.quantity),
    avgPrice: p.avg_price === null ? null : Number(p.avg_price),
  }));

  const holdings: Holding[] = [
    ...positions.map((p): Holding => ({ id: p.id, source: "manual", kind: p.kind, symbol: p.symbol, label: "Carga manual", quantity: p.quantity, avgPrice: p.avgPrice })),
    ...(iolRes.data ?? []).map(
      (p): Holding => ({
        id: `iol-${p.symbol}`,
        source: "iol",
        kind: byma.get(p.symbol)?.kind ?? "accion",
        symbol: p.symbol,
        label: p.description ?? "InvertirOnline",
        quantity: Number(p.quantity),
        avgPrice: null,
        fallback: { amount: Number(p.valuation), currency: p.currency as Currency },
      }),
    ),
    ...wallets.flatMap((w) =>
      (w.balances ?? []).map(
        (b): Holding => ({
          id: `${w.id}-${b.symbol}`,
          source: "wallet",
          kind: "cripto",
          symbol: b.symbol,
          label: w.label || `${CHAIN_LABEL[w.chain]} ${shortAddress(w.address)}`,
          quantity: b.amount,
          avgPrice: null,
        }),
      ),
    ),
  ];

  const cryptoIds = holdings.filter((h) => h.kind === "cripto").map((h) => CRYPTO_IDS[h.symbol]).filter(Boolean);
  const crypto = await getCryptoQuotes(cryptoIds);
  const netWorth = valueHoldings(holdings, { byma, crypto }, mep);

  // Foto del día: se actualiza en cada visita, así el gráfico guarda el último valor de cada día.
  if (holdings.length && netWorth.totalUsd > 0) {
    await supabase.from("net_worth_snapshots").upsert({
      user_id: userId,
      day: today,
      total_ars: Math.round(netWorth.totalArs),
      total_usd: Math.round(netWorth.totalUsd * 100) / 100,
      breakdown: netWorth.byKind,
      updated_at: new Date().toISOString(),
    });
  }

  const { data: snapRows } = await supabase
    .from("net_worth_snapshots")
    .select("day, total_ars, total_usd")
    .order("day", { ascending: true })
    .limit(400);

  return {
    fx,
    mep,
    netWorth,
    wallets,
    positions,
    snapshots: (snapRows ?? []).map((s) => ({ day: s.day, totalArs: Number(s.total_ars), totalUsd: Number(s.total_usd) })),
    fetchedAt: new Date().toISOString(),
  };
}
