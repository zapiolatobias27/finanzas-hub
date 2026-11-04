import { connectIol, syncAll } from "@/app/actions";
import type { Position } from "@/lib/load";
import { formatMoney } from "@/lib/money";
import { ActionForm, inputClass } from "./action-form";

type Integration = { provider: string; status: string; last_sync_at: string | null };

function StatusBadge({ integration }: { integration?: Integration }) {
  if (!integration) return <span className="text-xs text-neutral-400">No conectado</span>;
  if (integration.status !== "active") return <span className="text-xs text-red-600">Reconectar</span>;
  const when = integration.last_sync_at
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(integration.last_sync_at))
    : "nunca";
  return <span className="text-xs text-emerald-600">Conectado · sync {when}</span>;
}

export function IntegrationsPanel({ integrations, positions }: { integrations: Integration[]; positions: Position[] }) {
  const mp = integrations.find((i) => i.provider === "mercadopago");
  const iol = integrations.find((i) => i.provider === "iol");

  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cuentas conectadas</h2>
        {(mp || iol) && (
          <form action={syncAll}>
            <button className="rounded-md border px-2 py-1 text-xs">Sincronizar</button>
          </form>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Mercado Pago</p>
          <StatusBadge integration={mp} />
        </div>
        {(!mp || mp.status !== "active") && (
          <a href="/api/integrations/mercadopago/connect" className="inline-block rounded-md bg-sky-500 px-3 py-1.5 text-sm text-white">
            Conectar con Mercado Pago
          </a>
        )}
      </div>

      <div className="space-y-2 border-t pt-4 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">InvertirOnline</p>
          <StatusBadge integration={iol} />
        </div>
        {(!iol || iol.status !== "active") && (
          <ActionForm action={connectIol} submitLabel="Conectar IOL" className="space-y-2">
            <p className="text-xs text-neutral-500">
              Necesitás tener habilitada la API en tu cuenta de IOL. Usamos tus datos una sola vez para obtener un token de solo lectura; la contraseña no se guarda.
            </p>
            <input name="username" autoComplete="username" placeholder="Usuario IOL" className={inputClass} />
            <input name="password" type="password" autoComplete="current-password" placeholder="Contraseña IOL" className={inputClass} />
          </ActionForm>
        )}
        {positions.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol} className="border-t dark:border-neutral-800">
                  <td className="py-1 font-medium">{p.symbol}</td>
                  <td className="py-1 text-neutral-500">{p.type}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(p.valuation, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
