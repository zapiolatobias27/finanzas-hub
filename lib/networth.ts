// Valuación del patrimonio. Puro y testeable: recibe tenencias + cotizaciones y devuelve valores en ARS y USD.
import { CRYPTO_IDS, type AssetKind } from "./assets";
import type { Currency } from "./money";

export type HoldingSource = "manual" | "iol" | "wallet";

export interface Holding {
  id: string;
  source: HoldingSource;
  kind: AssetKind;
  symbol: string;
  /** Texto secundario: "Billetera Ledger", "IOL", etc. */
  label: string;
  quantity: number;
  /** Precio promedio de compra en la moneda de cotización (ARS para BYMA, USD para cripto). */
  avgPrice: number | null;
  /** Valor conocido si no hay cotización en vivo (ej: valorizado que informó IOL). */
  fallback?: { amount: number; currency: Currency };
}

export interface Quote {
  price: number;
  changePct: number | null;
}

export interface Quotes {
  /** CEDEARs y acciones de BYMA, en ARS. */
  byma: Map<string, Quote>;
  /** Cripto por id de CoinGecko, en USD. */
  crypto: Record<string, Quote>;
}

export interface ValuedHolding extends Holding {
  price: number | null;
  priceCurrency: Currency;
  valueArs: number;
  valueUsd: number;
  changePct: number | null;
  /** Ganancia/pérdida vs. precio promedio de compra. */
  pnlPct: number | null;
  live: boolean;
}

export interface NetWorth {
  items: ValuedHolding[];
  totalArs: number;
  totalUsd: number;
  byKind: Record<AssetKind, { ars: number; usd: number }>;
  /** Variación del día en USD, ponderada por tenencia. */
  change24hUsd: number;
}

function quoteFor(h: Holding, quotes: Quotes): { quote: Quote | undefined; currency: Currency } {
  if (h.kind === "cripto") {
    const id = CRYPTO_IDS[h.symbol];
    return { quote: id ? quotes.crypto[id] : undefined, currency: "USD" };
  }
  return { quote: quotes.byma.get(h.symbol), currency: "ARS" };
}

export function valueHoldings(holdings: Holding[], quotes: Quotes, mep: number): NetWorth {
  const byKind: NetWorth["byKind"] = { cedear: { ars: 0, usd: 0 }, accion: { ars: 0, usd: 0 }, cripto: { ars: 0, usd: 0 } };
  let change24hUsd = 0;

  const items = holdings.map((h): ValuedHolding => {
    const { quote, currency } = quoteFor(h, quotes);
    let valueArs = 0;
    let valueUsd = 0;
    if (quote) {
      const value = quote.price * h.quantity;
      valueArs = currency === "ARS" ? value : value * mep;
      valueUsd = currency === "USD" ? value : value / mep;
    } else if (h.fallback) {
      valueArs = h.fallback.currency === "ARS" ? h.fallback.amount : h.fallback.amount * mep;
      valueUsd = h.fallback.currency === "USD" ? h.fallback.amount : h.fallback.amount / mep;
    }

    const changePct = quote?.changePct ?? null;
    if (changePct !== null && changePct > -100) change24hUsd += valueUsd - valueUsd / (1 + changePct / 100);
    byKind[h.kind].ars += valueArs;
    byKind[h.kind].usd += valueUsd;

    return {
      ...h,
      price: quote?.price ?? null,
      priceCurrency: currency,
      valueArs,
      valueUsd,
      changePct,
      pnlPct: quote && h.avgPrice ? (quote.price / h.avgPrice - 1) * 100 : null,
      live: Boolean(quote),
    };
  });

  items.sort((a, b) => b.valueUsd - a.valueUsd);
  return {
    items,
    totalArs: items.reduce((s, i) => s + i.valueArs, 0),
    totalUsd: items.reduce((s, i) => s + i.valueUsd, 0),
    byKind,
    change24hUsd,
  };
}
