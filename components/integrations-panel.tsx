import { ArrowUpRight, RefreshCw } from "lucide-react";
import { connectIol, syncAll } from "@/app/actions";
import type { Position } from "@/lib/load";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm } from "./action-form";

type Integration = { provider: string; status: string; last_sync_at: string | null };

function Status({ integration }: { integration?: Integration }) {
  const state = !integration ? "off" : integration.status !== "active" ? "error" : "on";
  const when = integration?.last_sync_at
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(integration.last_sync_at))
    : null;
  return (
    <span className={cn("chip", state === "on" ? "border-success/30 bg-success/10 text-success" : state === "error" ? "border-danger/30 bg-danger/10 text-danger" : "text-muted")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", state === "on" ? "animate-pulse-soft bg-success" : state === "error" ? "bg-danger" : "bg-faint")} aria-hidden="true" />
      {state === "on" ? (when ? `Sync ${when}` : "Conectado") : state === "error" ? "Reconectar" : "No conectado"}
    </span>
  );
}

function Logo({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-bold tracking-tight", className)} aria-hidden="true" translate="no">
      {text}
    </span>
  );
}

export function IntegrationsPanel({ integrations, positions }: { integrations: Integration[]; positions: Position[] }) {
  const mp = integrations.find((i) => i.provider === "mercadopago");
  const iol = integrations.find((i) => i.provider === "iol");

  return (
    <section className="card space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Cuentas conectadas</h2>
        {(mp || iol) && (
          <form action={syncAll}>
            <button className="btn-ghost px-3 py-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Sincronizar
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border bg-surface-2 p-4">
        <Logo text="MP" className="bg-[#00b1ea] text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-medium" translate="no">Mercado Pago</p>
          <Status integration={mp} />
        </div>
        {(!mp || mp.status !== "active") && (
          <a href="/api/integrations/mercadopago/connect" className="btn-primary px-3 py-1.5 text-xs">
            Conectar <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border bg-surface-2 p-4">
        <div className="flex items-center gap-3">
          <Logo text="IOL" className="bg-ink text-bg" />
          <div className="min-w-0 flex-1">
            <p className="font-medium" translate="no">InvertirOnline</p>
            <Status integration={iol} />
          </div>
        </div>
        {(!iol || iol.status !== "active") && (
          <ActionForm action={connectIol} submitLabel="Conectar IOL" className="space-y-3" buttonClassName="w-full">
            <p className="text-xs text-muted">
              Necesitás la API habilitada en tu cuenta de IOL. Usamos tus datos una sola vez para obtener un acceso de solo lectura; la contraseña no se guarda.
            </p>
            <label className="field">
              Usuario IOL
              <input name="username" autoComplete="username" spellCheck={false} placeholder="usuario…" className="input" />
            </label>
            <label className="field">
              Contraseña IOL
              <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="input" />
            </label>
          </ActionForm>
        )}
        {positions.length > 0 && (
          <table className="w-full text-sm">
            <caption className="sr-only">Posiciones en IOL</caption>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol} className="border-t">
                  <td className="py-2 font-semibold" translate="no">{p.symbol}</td>
                  <td className="py-2 text-xs text-muted">{p.type}</td>
                  <td className="num py-2 text-right">{formatMoney(p.valuation, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
