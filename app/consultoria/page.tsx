import { ChevronRight, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConsultWizard } from "@/components/consult-wizard";
import type { ConsultPlan } from "@/lib/consulting/engine";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Consultoría" };

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const PROFILE_LABEL = { conservador: "Conservador", moderado: "Moderado", agresivo: "Agresivo" } as const;

export default async function ConsultoriaPage() {
  const { supabase } = await requireUser();
  const { data: past } = await supabase.from("consultations").select("id, plan, created_at").order("created_at", { ascending: false }).limit(6);
  const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <div className="space-y-10">
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="eyebrow reveal">Consultoría de inversiones</p>
        <h1 className="reveal font-display text-4xl font-semibold tracking-tight md:text-5xl" style={delay(1)}>
          Nueve preguntas, <span className="text-accent">un plan a tu medida.</span>
        </h1>
        <p className="reveal text-muted" style={delay(2)}>
          Te preguntamos qué querés lograr, cuánto riesgo tolerás y cuánto tenés para invertir. Te devolvemos en qué tipos de activos repartirlo, cuánto en cada uno y cómo hacerlo, con las noticias y los datos del día.
        </p>
      </header>

      <div className="reveal" style={delay(3)}>
        <ConsultWizard />
      </div>

      <p className="mx-auto flex max-w-2xl gap-2 text-xs text-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Herramienta educativa: arma carteras modelo por tipo de activo según tu perfil. No es asesoramiento financiero personalizado ni una recomendación de compra o venta. Antes de invertir, evaluá los riesgos y consultá con un asesor registrado ante la CNV.
      </p>

      {past && past.length > 0 && (
        <section className="mx-auto max-w-2xl space-y-3">
          <h2 className="font-display text-lg font-semibold">Tus consultas anteriores</h2>
          <ul className="space-y-2">
            {past.map((c) => {
              const plan = c.plan as ConsultPlan;
              const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 });
              return (
                <li key={c.id}>
                  <Link href={`/consultoria/${c.id}`} className="card card-hover focus-ring flex items-center gap-4 px-4 py-3">
                    <span className="chip shrink-0">{PROFILE_LABEL[plan.profile]}</span>
                    <span className="num font-semibold">{money.format(plan.amount)}</span>
                    <span className="ml-auto text-xs text-muted">{dateFmt.format(new Date(c.created_at))}</span>
                    <ChevronRight className="h-4 w-4 text-faint" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
