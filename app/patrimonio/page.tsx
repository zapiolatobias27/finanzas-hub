import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { FxStrip } from "@/components/fx-strip";
import { HoldingsTable } from "@/components/holdings-table";
import { NetWorthChart } from "@/components/net-worth-chart";
import { AddPositionForm, WalletsPanel } from "@/components/patrimonio-forms";
import { KIND_LABEL, type AssetKind } from "@/lib/assets";
import { PRICE_TTL_SECONDS } from "@/lib/market";
import { formatMoney } from "@/lib/money";
import { loadPatrimonio } from "@/lib/patrimonio";
import { requireUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Patrimonio" };
// Siempre server-side y fresco: las cotizaciones las cachea `lib/market` por su cuenta.
export const dynamic = "force-dynamic";

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const KIND_BAR: Record<AssetKind, string> = { cedear: "bg-info", accion: "bg-accent-2", cripto: "bg-accent-3" };

export default async function PatrimonioPage() {
  const { supabase, user } = await requireUser();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const data = await loadPatrimonio(supabase, user.id, today);
  const { netWorth } = data;

  const prevUsd = netWorth.totalUsd - netWorth.change24hUsd;
  const changePct = prevUsd > 0 ? (netWorth.change24hUsd / prevUsd) * 100 : 0;
  const kinds = (Object.keys(netWorth.byKind) as AssetKind[]).filter((k) => netWorth.byKind[k].usd > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow reveal">Patrimonio</p>
          <h1 className="reveal font-display text-4xl font-semibold tracking-tight md:text-5xl" style={delay(1)}>
            Tus inversiones
          </h1>
        </div>
        <div className="reveal" style={delay(2)}>
          <AutoRefresh fetchedAt={data.fetchedAt} intervalSec={PRICE_TTL_SECONDS} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card reveal relative overflow-hidden p-6 md:p-7" style={delay(2)}>
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
          <p className="relative text-sm font-medium text-muted">Valor total</p>
          <p className="num relative mt-1 text-5xl font-semibold md:text-6xl">{formatMoney(netWorth.totalUsd, "USD")}</p>
          <p className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="num text-muted">{formatMoney(netWorth.totalArs)}</span>
            {netWorth.totalUsd > 0 && (
              <span className={cn("chip num", netWorth.change24hUsd >= 0 ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger")}>
                {netWorth.change24hUsd >= 0 ? "▲ +" : "▼ "}
                {formatMoney(netWorth.change24hUsd, "USD")} ({changePct >= 0 ? "+" : ""}
                {changePct.toFixed(2)}%) hoy
              </span>
            )}
          </p>

          {kinds.length > 0 && (
            <div className="relative mt-6 space-y-2">
              <div className="flex h-3 overflow-hidden rounded-full bg-track">
                {kinds.map((k, i) => (
                  <div
                    key={k}
                    className={cn("bar-fill rounded-none first:rounded-l-full last:rounded-r-full", KIND_BAR[k])}
                    style={{ width: `${(netWorth.byKind[k].usd / netWorth.totalUsd) * 100}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {kinds.map((k) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", KIND_BAR[k])} aria-hidden="true" />
                    {KIND_LABEL[k]} <span className="num text-ink">{Math.round((netWorth.byKind[k].usd / netWorth.totalUsd) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card reveal p-6" style={delay(3)}>
          <h2 className="mb-3 font-display text-lg font-semibold">Evolución en dólares</h2>
          <NetWorthChart snapshots={data.snapshots} />
        </div>
      </section>

      <div className="reveal" style={delay(4)}>
        <FxStrip fx={data.fx} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card reveal p-6" style={delay(5)}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Tenencias</h2>
            <span className="text-xs text-muted">
              Precios: BYMA (data912) · CoinGecko · dólar MEP <span className="num">{formatMoney(data.mep)}</span>
            </span>
          </div>
          <HoldingsTable items={netWorth.items} />
        </section>

        <aside className="space-y-6">
          <div className="reveal" style={delay(5)}>
            <AddPositionForm />
          </div>
          <div className="reveal" style={delay(6)}>
            <WalletsPanel wallets={data.wallets} />
          </div>
        </aside>
      </div>
    </div>
  );
}
