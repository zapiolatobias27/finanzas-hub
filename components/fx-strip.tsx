import type { FxRates } from "@/lib/market";
import { formatMoney } from "@/lib/money";

/** Cotizaciones del dólar (venta) desde dolarapi.com. */
export function FxStrip({ fx }: { fx: FxRates | null }) {
  if (!fx) {
    return (
      <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
        No pudimos traer el dólar en este momento: usamos el de tu perfil hasta que vuelva.
      </p>
    );
  }
  const rows = [
    { label: "MEP", value: fx.mep, main: true },
    { label: "Blue", value: fx.blue },
    { label: "CCL", value: fx.ccl },
    { label: "Oficial", value: fx.oficial },
  ].filter((r): r is { label: string; value: number; main?: boolean } => r.value !== null);

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label} className={r.main ? "card border-accent/40 px-4 py-3" : "card px-4 py-3"}>
          <dt className="text-xs text-muted">
            Dólar {r.label}
            {r.main && <span className="ml-1 text-accent">· referencia</span>}
          </dt>
          <dd className="num text-xl font-semibold">{formatMoney(r.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
