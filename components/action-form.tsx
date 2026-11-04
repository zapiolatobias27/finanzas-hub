"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/** Form genérico que llama a una server action y muestra los errores de Zod. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
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
    <form ref={formRef} onSubmit={onSubmit} className={cn("space-y-2", className)}>
      {children}
      <button
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
      {result?.message && <p className={cn("text-sm", result.ok ? "text-emerald-600" : "text-red-600")}>{result.message}</p>}
      {errors.map((msg) => (
        <p key={msg} className="text-sm text-red-600">
          {msg}
        </p>
      ))}
    </form>
  );
}

export const inputClass = "w-full rounded-md border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";
