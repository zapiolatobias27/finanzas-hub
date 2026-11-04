"use client";

import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Refresca la página cada `intervalSec` mientras la pestaña está visible, así los precios se
 * actualizan solos. El server cachea las cotizaciones ~60 s, por lo que no castiga las APIs.
 */
export function AutoRefresh({ fetchedAt, intervalSec = 60 }: { fetchedAt: string; intervalSec?: number }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [pending, startTransition] = useTransition();
  // Arranca en el instante del server para que el primer render coincida (sin error de hidratación).
  const [now, setNow] = useState(() => Date.parse(fetchedAt));

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [fetchedAt]);

  useEffect(() => {
    if (paused) return;
    const refresh = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const timer = setInterval(refresh, intervalSec * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [paused, intervalSec, router]);

  const ago = Math.max(0, Math.round((now - Date.parse(fetchedAt)) / 1000));
  const label = paused ? "Actualización pausada" : pending ? "Actualizando…" : ago < 5 ? "En vivo · recién" : `En vivo · hace ${ago} s`;

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={!paused}
      title={paused ? "Reanudar actualización automática" : "Pausar actualización automática"}
      className={cn("chip focus-ring num gap-2 py-1 transition-colors", paused ? "text-muted" : "border-success/30 bg-success/10 text-success")}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", paused ? "bg-faint" : "animate-pulse-soft bg-success")} aria-hidden="true" />
      <span aria-live="polite">{label}</span>
      {paused ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3 opacity-60" aria-hidden="true" />}
    </button>
  );
}
