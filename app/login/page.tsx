"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Revisá el email: parece incompleto."),
  password: z.string(),
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setPending(true);
    const supabase = createClient();

    // Con contraseña: entra directo. Sin contraseña: magic link por mail.
    if (parsed.data.password) {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        setPending(false);
        return setError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos. Probá de nuevo." : error.message);
      }
      router.replace("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="grid items-center gap-12 py-6 md:min-h-[70vh] md:grid-cols-[1.15fr_1fr]">
      <section className="space-y-6">
        <p className="eyebrow reveal">{BRAND.eyebrow}</p>
        <h1 className="reveal font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl" style={{ "--i": 1 } as React.CSSProperties}>
          {BRAND.headline}
          <br />
          <span className="text-accent ">{BRAND.accentLine}</span>
        </h1>
        <p className="reveal max-w-md text-lg text-muted" style={{ "--i": 2 } as React.CSSProperties}>
          {BRAND.sub}
        </p>
        <ul className="space-y-2.5">
          {BRAND.features.map((f, i) => (
            <li key={f} className="reveal flex items-center gap-3 text-sm" style={{ "--i": 3 + i } as React.CSSProperties}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-accent">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="card reveal p-7 md:p-8" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div>
            <h2 className="font-display text-xl font-semibold">Entrá a {BRAND.short}</h2>
            <p className="text-sm text-muted">Con contraseña o con un link a tu mail.</p>
          </div>
        </div>
        {sent ? (
          <div className="animate-pop space-y-2 rounded-xl border border-accent/40 bg-accent/10 p-4" aria-live="polite">
            <p className="font-medium">Revisá tu correo</p>
            <p className="text-sm text-muted">
              Te mandamos un link a <b className="text-ink">{email}</b>. Abrilo en esta misma compu.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <label className="field">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@email.com…"
                className="input"
              />
            </label>
            <label className="field">
              Contraseña <span className="font-normal text-faint">(vacía = magic link)</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </label>
            <button className="btn-primary w-full py-2.5" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Entrando…
                </>
              ) : (
                <>
                  {password ? "Entrar" : "Mandarme el link"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            <p className="min-h-5 text-sm text-danger" aria-live="polite">
              {error}
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
