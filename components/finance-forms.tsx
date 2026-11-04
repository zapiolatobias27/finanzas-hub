import { addGoal, addTransaction, saveInvestorProfile } from "@/app/actions";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { ActionForm, inputClass } from "./action-form";

const card = "rounded-xl border bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

export function TransactionForm({ today }: { today: string }) {
  return (
    <ActionForm action={addTransaction} submitLabel="Agregar movimiento" className={card}>
      <h2 className="font-semibold">Nuevo movimiento</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <select name="kind" className={inputClass} defaultValue="expense">
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
        <input name="amount" type="number" step="0.01" min={0} placeholder="Monto" required className={inputClass} />
        <select name="currency" className={inputClass} defaultValue="ARS">
          <option>ARS</option>
          <option>USD</option>
        </select>
        <select name="category" className={inputClass} defaultValue="supermercado">
          {CATEGORY_KEYS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].label}
            </option>
          ))}
        </select>
        <input name="date" type="date" defaultValue={today} required className={inputClass} />
        <input name="description" placeholder="Descripción" className={inputClass} />
      </div>
    </ActionForm>
  );
}

export function GoalForm() {
  return (
    <ActionForm action={addGoal} submitLabel="Crear objetivo" className={card}>
      <h2 className="font-semibold">Objetivo financiero</h2>
      <div className="grid grid-cols-2 gap-2">
        <input name="name" placeholder="Ej: Viaje a Europa" required className={`${inputClass} col-span-2`} />
        <input name="targetAmount" type="number" min={1} placeholder="Monto objetivo" required className={inputClass} />
        <select name="currency" className={inputClass} defaultValue="USD">
          <option>ARS</option>
          <option>USD</option>
        </select>
        <input name="savedAmount" type="number" min={0} placeholder="Ya ahorrado" className={inputClass} />
        <input name="deadline" type="date" required className={inputClass} />
        <label className="col-span-2 text-xs text-neutral-500">
          Prioridad (1–5)
          <input name="priority" type="number" min={1} max={5} defaultValue={3} className={inputClass} />
        </label>
      </div>
    </ActionForm>
  );
}

export function InvestorProfileForm({
  defaults,
}: {
  defaults: { riskTolerance: number; emergencyMonths: number; emergencySaved: number; usdArs: number } | null;
}) {
  return (
    <ActionForm action={saveInvestorProfile} submitLabel="Guardar perfil" className={card}>
      <h2 className="font-semibold">Perfil de inversor</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs text-neutral-500">
          Tolerancia al riesgo
          <select name="riskTolerance" className={inputClass} defaultValue={defaults?.riskTolerance ?? 3}>
            <option value={1}>1 · Muy conservador</option>
            <option value={2}>2 · Conservador</option>
            <option value={3}>3 · Moderado</option>
            <option value={4}>4 · Arriesgado</option>
            <option value={5}>5 · Muy arriesgado</option>
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          Fondo de emergencia (meses)
          <input name="emergencyMonths" type="number" min={1} max={24} defaultValue={defaults?.emergencyMonths ?? 6} className={inputClass} />
        </label>
        <label className="text-xs text-neutral-500">
          Ya ahorrado para emergencias (ARS)
          <input name="emergencySaved" type="number" min={0} defaultValue={defaults?.emergencySaved ?? 0} className={inputClass} />
        </label>
        <label className="col-span-2 text-xs text-neutral-500">
          Dólar de referencia (MEP)
          <input name="usdArsRate" type="number" min={1} step="0.01" defaultValue={defaults?.usdArs ?? 1000} className={inputClass} />
        </label>
      </div>
    </ActionForm>
  );
}
