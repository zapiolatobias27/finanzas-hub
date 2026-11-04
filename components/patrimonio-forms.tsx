import { Plus, ShieldAlert, Wallet } from "lucide-react";
import { addPosition, addWallet, deleteWallet } from "@/app/patrimonio/actions";
import { CHAIN_LABEL, CRYPTO_IDS, shortAddress } from "@/lib/assets";
import type { WalletRow } from "@/lib/patrimonio";
import { ActionForm } from "./action-form";
import { ConfirmDelete } from "./confirm-delete";

function Segmented({ name, options, defaultValue }: { name: string; options: { value: string; label: string }[]; defaultValue: string }) {
  return (
    <fieldset className="grid gap-1 rounded-xl border bg-surface-2 p-1 text-sm font-medium" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <legend className="sr-only">{name}</legend>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
          <span className="block rounded-lg py-1.5 text-center text-muted transition-colors duration-200 peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

const POPULAR = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "MELI", "KO", "GGAL", "YPFD", "PAMP", "BTC", "ETH", "USDT"];

export function AddPositionForm() {
  return (
    <ActionForm action={addPosition} submitLabel="Agregar Inversión" className="card space-y-4 p-6" buttonClassName="w-full">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
          <Plus className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">Agregar inversión</h2>
          <p className="text-xs text-muted">El precio se actualiza solo, en vivo.</p>
        </div>
      </div>
      <Segmented
        name="kind"
        defaultValue="cedear"
        options={[
          { value: "cedear", label: "CEDEAR" },
          { value: "accion", label: "Acción" },
          { value: "cripto", label: "Cripto" },
        ]}
      />
      <label className="field">
        Ticker
        <input name="symbol" list="popular-tickers" placeholder="SPY, GGAL, BTC…" required autoComplete="off" spellCheck={false} className="input font-mono uppercase" />
        <datalist id="popular-tickers">
          {POPULAR.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          Cantidad
          <input name="quantity" type="number" inputMode="decimal" step="any" min={0} placeholder="10…" required autoComplete="off" className="input num" />
        </label>
        <label className="field">
          Precio de compra <span className="font-normal text-faint">(opcional)</span>
          <input name="avgPrice" type="number" inputMode="decimal" step="any" min={0} placeholder="ARS o USD…" autoComplete="off" className="input num" />
        </label>
      </div>
      <p className="text-[11px] text-faint">Cripto soportadas: {Object.keys(CRYPTO_IDS).join(", ")}. Precio de compra: ARS para CEDEARs y acciones, USD para cripto.</p>
    </ActionForm>
  );
}

export function WalletsPanel({ wallets }: { wallets: WalletRow[] }) {
  return (
    <section className="card space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-3/15 text-accent-3" aria-hidden="true">
          <Wallet className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">Billeteras cripto</h2>
          <p className="text-xs text-muted">Leemos el saldo de la blockchain con tu dirección pública.</p>
        </div>
      </div>

      {wallets.length > 0 && (
        <ul className="space-y-2">
          {wallets.map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-xl border bg-surface-2 p-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.label || CHAIN_LABEL[w.chain]}</span>
                <span className="block font-mono text-xs text-muted" translate="no">
                  {CHAIN_LABEL[w.chain]} · {shortAddress(w.address)}
                </span>
                <span className="block text-xs text-muted">
                  {w.balances === null
                    ? "No pudimos leer el saldo ahora; reintentamos solos."
                    : w.balances.length === 0
                      ? "Sin saldo"
                      : w.balances.map((b) => `${b.amount.toLocaleString("es-AR", { maximumFractionDigits: 6 })} ${b.symbol}`).join(" · ")}
                </span>
              </span>
              <ConfirmDelete action={deleteWallet.bind(null, w.id)} label={`Quitar billetera ${w.label || shortAddress(w.address)}`} confirmText="¿Quitar esta billetera? Tus fondos no se tocan: solo dejamos de seguirla." />
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={addWallet} submitLabel="Seguir Billetera" className="space-y-3 border-t pt-4" buttonClassName="w-full">
        <Segmented
          name="chain"
          defaultValue="ethereum"
          options={[
            { value: "ethereum", label: "Ethereum" },
            { value: "bitcoin", label: "Bitcoin" },
          ]}
        />
        <label className="field">
          Dirección pública
          <input name="address" placeholder="0x… o bc1…" required autoComplete="off" spellCheck={false} className="input font-mono text-xs" />
        </label>
        <label className="field">
          Nombre <span className="font-normal text-faint">(opcional)</span>
          <input name="label" placeholder="Ledger, MetaMask…" autoComplete="off" className="input" />
        </label>
        <p className="flex gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Solo la dirección pública. Nunca pegues tu frase semilla ni claves privadas: ninguna app legítima te las pide.
        </p>
      </ActionForm>
    </section>
  );
}
