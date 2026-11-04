import { Gauge, Plus, Target } from "lucide-react";
import { addGoal, addTransaction, saveInvestorProfile } from "@/app/actions";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { ActionForm } from "./action-form";

function Title({ icon: Icon, title, sub }: { icon: typeof Plus; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

export function TransactionForm({ today }: { today: string }) {
  return (
    <ActionForm action={addTransaction} submitLabel="Agregar Movimiento" className="card space-y-4 p-6" buttonClassName="w-full">
      <Title icon={Plus} title="Nuevo movimiento" sub="Gasto o ingreso manual" />
      <fieldset className="grid grid-cols-2 gap-1 rounded-xl border bg-surface-2 p-1 text-sm font-medium">
        <legend className="sr-only">Tipo</legend>
        {[
          { v: "expense", l: "Gasto" },
          { v: "income", l: "Ingreso" },
        ].map((o) => (
          <label key={o.v} className="cursor-pointer">
            <input type="radio" name="kind" value={o.v} defaultChecked={o.v === "expense"} className="peer sr-only" />
            <span className="block rounded-lg py-1.5 text-center text-muted transition-colors duration-200 peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {o.l}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="field">
          Monto
          <input name="amount" type="number" inputMode="decimal" step="0.01" min={0} placeholder="0,00…" required autoComplete="off" className="input num text-base" />
        </label>
        <label className="field">
          Moneda
          <select name="currency" className="input" defaultValue="ARS">
            <option>ARS</option>
            <option>USD</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          Categoría
          <select name="category" className="input" defaultValue="supermercado">
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Fecha
          <input name="date" type="date" defaultValue={today} required className="input" />
        </label>
      </div>
      <label className="field">
        Descripción
        <input name="description" placeholder="Supermercado, alquiler…" autoComplete="off" className="input" />
      </label>
    </ActionForm>
  );
}

export function GoalForm() {
  return (
    <ActionForm action={addGoal} submitLabel="Crear Objetivo" className="card space-y-4 p-6" buttonClassName="w-full">
      <Title icon={Target} title="Objetivo financiero" sub="Viaje, auto, fondo para un proyecto…" />
      <label className="field">
        Nombre
        <input name="name" placeholder="Viaje a Europa…" required autoComplete="off" className="input" />
      </label>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="field">
          Monto objetivo
          <input name="targetAmount" type="number" inputMode="numeric" min={1} placeholder="5000…" required autoComplete="off" className="input num" />
        </label>
        <label className="field">
          Moneda
          <select name="currency" className="input" defaultValue="USD">
            <option>ARS</option>
            <option>USD</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          Ya ahorrado
          <input name="savedAmount" type="number" inputMode="numeric" min={0} placeholder="0…" autoComplete="off" className="input num" />
        </label>
        <label className="field">
          Fecha límite
          <input name="deadline" type="date" required className="input" />
        </label>
      </div>
      <label className="field">
        Prioridad
        <input name="priority" type="range" min={1} max={5} defaultValue={3} className="w-full accent-[rgb(var(--accent))]" />
        <span className="flex justify-between text-[10px] text-faint">
          <span>Baja</span>
          <span>Alta</span>
        </span>
      </label>
    </ActionForm>
  );
}

export function InvestorProfileForm({
  defaults,
}: {
  defaults: { riskTolerance: number; emergencyMonths: number; emergencySaved: number; usdArs: number } | null;
}) {
  return (
    <ActionForm action={saveInvestorProfile} submitLabel="Guardar Perfil" className="card space-y-4 p-6" buttonClassName="w-full">
      <Title icon={Gauge} title="Perfil de inversor" sub="Define el mix de instrumentos del plan" />
      <label className="field">
        Tolerancia al riesgo
        <select name="riskTolerance" className="input" defaultValue={defaults?.riskTolerance ?? 3}>
          <option value={1}>1 · Muy conservador</option>
          <option value={2}>2 · Conservador</option>
          <option value={3}>3 · Moderado</option>
          <option value={4}>4 · Arriesgado</option>
          <option value={5}>5 · Muy arriesgado</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          Fondo de emergencia (meses)
          <input name="emergencyMonths" type="number" inputMode="numeric" min={1} max={24} defaultValue={defaults?.emergencyMonths ?? 6} className="input num" />
        </label>
        <label className="field">
          Ya ahorrado (ARS)
          <input name="emergencySaved" type="number" inputMode="numeric" min={0} defaultValue={defaults?.emergencySaved ?? 0} className="input num" />
        </label>
      </div>
      <label className="field">
        Dólar de referencia (MEP)
        <input name="usdArsRate" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={defaults?.usdArs ?? 1000} className="input num" />
      </label>
    </ActionForm>
  );
}
