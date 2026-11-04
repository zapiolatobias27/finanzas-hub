import { deletePosition } from "@/app/patrimonio/actions";
import { KIND_LABEL, type AssetKind } from "@/lib/assets";
import { formatMoney } from "@/lib/money";
import type { ValuedHolding } from "@/lib/networth";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "./confirm-delete";

const KIND_STYLE: Record<AssetKind, string> = {
  cedear: "bg-info/10 text-info",
  accion: "bg-accent-2/10 text-accent-2",
  cripto: "bg-accent-3/15 text-accent-3",
};

const SOURCE_LABEL = { manual: "Manual", iol: "IOL", wallet: "Billetera" } as const;

const qty = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 8 });
const price = (v: number, currency: "ARS" | "USD") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: v < 10 ? 4 : 2 }).format(v);

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-faint">—</span>;
  return (
    <span className={cn("num font-medium", value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted")}>
      {value > 0 ? "▲" : value < 0 ? "▼" : ""} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function HoldingsTable({ items }: { items: ValuedHolding[] }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted">Todavía no cargaste inversiones. Agregá CEDEARs, acciones, cripto o una billetera.</p>;
  }

  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Tenencias valuadas con precios en vivo</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-faint">
            <th className="px-2 pb-2 font-medium">Activo</th>
            <th className="px-2 pb-2 text-right font-medium">Cantidad</th>
            <th className="px-2 pb-2 text-right font-medium">Precio</th>
            <th className="px-2 pb-2 text-right font-medium">Hoy</th>
            <th className="px-2 pb-2 text-right font-medium">Valor</th>
            <th className="w-10 pb-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => (
            <tr key={h.id} className="reveal border-t transition-colors hover:bg-surface-2" style={{ "--i": i } as React.CSSProperties}>
              <td className="px-2 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold", KIND_STYLE[h.kind])} aria-hidden="true">
                    {h.symbol.slice(0, 4)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold" translate="no">
                      {h.symbol}
                    </span>
                    <span className="block max-w-[14rem] truncate text-xs text-muted">
                      {KIND_LABEL[h.kind]} · {SOURCE_LABEL[h.source]}
                      {h.source === "wallet" ? ` · ${h.label}` : ""}
                      {!h.live && " · sin cotización en vivo"}
                    </span>
                  </span>
                </div>
              </td>
              <td className="num px-2 py-3 text-right">{qty.format(h.quantity)}</td>
              <td className="num px-2 py-3 text-right">
                {h.price === null ? "—" : price(h.price, h.priceCurrency)}
                {h.pnlPct !== null && (
                  <span className={cn("block text-[11px]", h.pnlPct >= 0 ? "text-success" : "text-danger")}>
                    {h.pnlPct >= 0 ? "+" : ""}
                    {h.pnlPct.toFixed(1)}% vs. compra
                  </span>
                )}
              </td>
              <td className="px-2 py-3 text-right">
                <Change value={h.changePct} />
              </td>
              <td className="px-2 py-3 text-right">
                <span className="num block font-semibold">{formatMoney(h.valueUsd, "USD")}</span>
                <span className="num block text-xs text-muted">{formatMoney(h.valueArs)}</span>
              </td>
              <td className="py-3 pl-1">
                {h.source === "manual" && (
                  <ConfirmDelete action={deletePosition.bind(null, h.id)} label={`Quitar ${h.symbol}`} confirmText={`¿Quitar ${h.symbol} de tu patrimonio?`} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
