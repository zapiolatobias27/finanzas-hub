"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/** Form genérico que llama a una server action y muestra los errores de Zod. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  buttonClassName,
  style,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  style?: React.CSSProperties;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(formData);
      setResult(res);
      if (res.ok) formRef.current?.reset();
    });
  }

  const errors = result && !result.ok ? Object.values(result.errors ?? {}).flat().filter(Boolean) : [];

  return (
    <form ref={formRef} onSubmit={onSubmit} className={cn("space-y-3", className)} style={style}>
      {children}
      <button disabled={pending} className={cn("btn-primary", buttonClassName)}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? "Guardando…" : submitLabel}
      </button>
      <div aria-live="polite" className="contents">
        {result?.message && (
          <p className={cn("animate-pop text-sm", result.ok ? "text-success" : "text-danger")}>{result.message}</p>
        )}
        {errors.map((msg) => (
          <p key={msg} className="animate-pop text-sm text-danger">
            {msg}
          </p>
        ))}
      </div>
    </form>
  );
}

export const inputClass = "input";
