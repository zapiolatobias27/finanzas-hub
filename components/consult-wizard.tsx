"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  Check,
  Clock,
  Coins,
  DollarSign,
  GraduationCap,
  Loader2,
  PiggyBank,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { createConsultation } from "@/app/consultoria/actions";
import type { ConsultAnswers } from "@/lib/consulting/engine";
import { cn } from "@/lib/utils";

type Answers = Partial<ConsultAnswers>;
type Option<T> = { value: T; label: string; hint?: string; icon?: LucideIcon };

const money = (v: number, currency: "ARS" | "USD") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

function Choice<T extends string | number | boolean>({ options, value, onChange }: { options: Option<T>[]; value?: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o, i) => {
        const selected = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "focus-ring reveal relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5",
              selected ? "border-accent bg-accent/5" : "bg-surface hover:border-accent/50",
            )}
          >
            {Icon && (
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors", selected ? "bg-accent text-accent-ink" : "bg-surface-2 text-accent")} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-semibold">{o.label}</span>
              {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
            </span>
            {selected && (
              <span className="animate-pop absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink" aria-hidden="true">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const STEPS = ["amount", "goal", "targetReturn", "horizon", "maxDrawdown", "reaction", "needsLiquidity", "experience", "crypto"] as const;
type Step = (typeof STEPS)[number];

const TITLES: Record<Step, string> = {
  amount: "¿Cuánto querés invertir?",
  goal: "¿Qué querés lograr con esta plata?",
  targetReturn: "¿Cuánto te gustaría ganar por año, en dólares?",
  horizon: "¿Cuándo vas a necesitar esta plata?",
  maxDrawdown: "¿Cuánta caída temporal aguantás sin vender?",
  reaction: "Si tu inversión cae 20% en un mes, ¿qué hacés?",
  needsLiquidity: "¿Necesitás poder sacar parte en cualquier momento?",
  experience: "¿Cuánta experiencia tenés invirtiendo?",
  crypto: "¿Querés incluir cripto?",
};

const HINTS: Partial<Record<Step, string>> = {
  targetReturn: "En dólares, por encima de la inflación de EE.UU. Más rendimiento siempre implica más riesgo.",
  maxDrawdown: "Todas las inversiones con rendimiento tienen bajas temporales. Elegí con lo que estés en paz.",
  reaction: "Contestá lo que harías de verdad, no lo que deberías hacer.",
};

export function ConsultWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ currency: "ARS" });
  const [amountText, setAmountText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const key = STEPS[step];
  const set = <K extends keyof ConsultAnswers>(k: K, v: ConsultAnswers[K]) => setAnswers((a) => ({ ...a, [k]: v }));
  const currency = answers.currency ?? "ARS";
  const amount = answers.amount ?? 0;
  const canContinue = key === "amount" ? amount > 0 : answers[key] !== undefined;
  const isLast = step === STEPS.length - 1;

  function submit() {
    startTransition(async () => {
      const res = await createConsultation(answers);
      // Si sale bien, la acción redirige al resultado; acá solo llegan errores.
      if (res && !res.ok) setErrors([res.message, ...Object.values(res.errors ?? {}).flat()].filter((e): e is string => Boolean(e)));
    });
  }

  const drawdownOptions: Option<number>[] = [5, 10, 20, 35].map((d) => ({
    value: d,
    label: `Hasta ${d}%`,
    hint: amount > 0 ? `${money(amount, currency)} podría verse como ${money(amount * (1 - d / 100), currency)} por un tiempo` : undefined,
    icon: TrendingDown,
  }));

  return (
    <div className="card mx-auto max-w-2xl overflow-hidden">
      <div className="h-1 bg-track">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-2 transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${(step + 1) / STEPS.length})`, transformOrigin: "left" }}
        />
      </div>

      <div className="space-y-6 p-6 md:p-8">
        <p className="num text-xs text-faint">
          Pregunta {step + 1} de {STEPS.length}
        </p>

        <div key={key} className="space-y-5">
          <div className="reveal space-y-1">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{TITLES[key]}</h2>
            {HINTS[key] && <p className="text-sm text-muted">{HINTS[key]}</p>}
          </div>

          {key === "amount" && (
            <div className="reveal space-y-3">
              <div className="flex items-stretch gap-2">
                <fieldset className="grid grid-cols-2 gap-1 rounded-xl border bg-surface-2 p-1 text-sm font-medium">
                  <legend className="sr-only">Moneda</legend>
                  {(["ARS", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={currency === c}
                      onClick={() => set("currency", c)}
                      className={cn("focus-ring rounded-lg px-3 transition-colors", currency === c ? "bg-surface text-ink shadow-sm" : "text-muted")}
                    >
                      {c}
                    </button>
                  ))}
                </fieldset>
                <label className="flex-1">
                  <span className="sr-only">Monto a invertir</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={amountText}
                    placeholder={currency === "ARS" ? "5.000.000…" : "3.000…"}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const n = Number(digits);
                      setAmountText(digits ? n.toLocaleString("es-AR") : "");
                      set("amount", n);
                    }}
                    className="input num h-14 text-2xl font-semibold"
                  />
                </label>
              </div>
              <p className="text-xs text-faint">Solo la plata que podés invertir: no incluyas tu fondo de emergencia.</p>
            </div>
          )}

          {key === "goal" && (
            <Choice
              value={answers.goal}
              onChange={(v) => set("goal", v)}
              options={[
                { value: "preservar", label: "Que no la coma la inflación", hint: "Mantener el poder de compra", icon: ShieldCheck },
                { value: "dolarizar", label: "Proteger en dólares", hint: "Cubrirme de devaluaciones", icon: DollarSign },
                { value: "renta", label: "Generar ingresos", hint: "Cobrar intereses o cupones periódicos", icon: Coins },
                { value: "crecer", label: "Hacerla crecer", hint: "Maximizar a largo plazo", icon: Rocket },
              ]}
            />
          )}

          {key === "targetReturn" && (
            <Choice
              value={answers.targetReturn}
              onChange={(v) => set("targetReturn", v)}
              options={[
                { value: 4, label: "3 a 5%", hint: "Tranquilo, bajo riesgo", icon: PiggyBank },
                { value: 8, label: "6 a 10%", hint: "Equilibrado", icon: TrendingUp },
                { value: 12, label: "10 a 15%", hint: "Ambicioso", icon: TrendingUp },
                { value: 20, label: "Más de 15%", hint: "Muy ambicioso, mucho riesgo", icon: Rocket },
              ]}
            />
          )}

          {key === "horizon" && (
            <Choice
              value={answers.horizon}
              onChange={(v) => set("horizon", v)}
              options={[
                { value: "lt1", label: "En menos de 1 año", icon: Clock },
                { value: "1to3", label: "En 1 a 3 años", icon: Clock },
                { value: "3to5", label: "En 3 a 5 años", icon: Clock },
                { value: "gt5", label: "En más de 5 años", icon: Clock },
              ]}
            />
          )}

          {key === "maxDrawdown" && <Choice value={answers.maxDrawdown} onChange={(v) => set("maxDrawdown", v)} options={drawdownOptions} />}

          {key === "reaction" && (
            <Choice
              value={answers.reaction}
              onChange={(v) => set("reaction", v)}
              options={[
                { value: "vendo", label: "Vendo para no perder más", icon: TrendingDown },
                { value: "espero", label: "Espero a que se recupere", icon: Clock },
                { value: "compro", label: "Aprovecho y compro más", icon: TrendingUp },
              ]}
            />
          )}

          {key === "needsLiquidity" && (
            <Choice
              value={answers.needsLiquidity}
              onChange={(v) => set("needsLiquidity", v)}
              options={[
                { value: true, label: "Sí, una parte", hint: "Dejamos al menos 15% disponible en el día", icon: Wallet },
                { value: false, label: "No, puedo dejarla quieta", icon: ShieldCheck },
              ]}
            />
          )}

          {key === "experience" && (
            <Choice
              value={answers.experience}
              onChange={(v) => set("experience", v)}
              options={[
                { value: "ninguna", label: "Ninguna", hint: "Nunca invertí", icon: GraduationCap },
                { value: "basica", label: "Básica", hint: "Plazo fijo, FCI", icon: GraduationCap },
                { value: "intermedia", label: "Intermedia", hint: "Bonos, CEDEARs", icon: GraduationCap },
                { value: "avanzada", label: "Avanzada", hint: "Acciones, derivados, cripto", icon: GraduationCap },
              ]}
            />
          )}

          {key === "crypto" && (
            <Choice
              value={answers.crypto}
              onChange={(v) => set("crypto", v)}
              options={[
                { value: "no", label: "No", icon: ShieldCheck },
                { value: "poco", label: "Un poco (hasta 5%)", icon: Bitcoin },
                { value: "si", label: "Sí (hasta 15%)", hint: "Solo si tu perfil lo permite", icon: Bitcoin },
              ]}
            />
          )}
        </div>

        <div aria-live="polite">
          {errors.map((e) => (
            <p key={e} className="animate-pop text-sm text-danger">
              {e}
            </p>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-5">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="btn-ghost disabled:invisible">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
          </button>
          {!isLast ? (
            <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="btn-primary px-5">
              Siguiente <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" disabled={!canContinue || pending} onClick={submit} className="btn-primary px-5">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Armando tu plan…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Ver Mi Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
