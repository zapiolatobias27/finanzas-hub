import { TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Snapshot } from "@/lib/patrimonio";

const W = 640;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 24, left: 12 };

const dayFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtDay = (d: string) => dayFmt.format(new Date(`${d}T12:00:00Z`));

/** Evolución del patrimonio en USD, un punto por día (área con trazo que se dibuja al cargar). */
export function NetWorthChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center">
        <TrendingUp className="h-6 w-6 text-accent" aria-hidden="true" />
        <p className="text-sm font-medium">El gráfico se arma día a día</p>
        <p className="max-w-xs text-xs text-muted">Guardamos una foto de tu patrimonio cada día que entrás. Desde mañana vas a ver la curva.</p>
      </div>
    );
  }

  const values = snapshots.map((s) => s.totalUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max * 0.05 || 1;
  const x = (i: number) => PAD.left + (i / (snapshots.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom);

  const line = snapshots.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.totalUsd).toFixed(1)}`).join(" ");
  const area = `${line} L${x(snapshots.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = last.totalUsd - first.totalUsd;
  const deltaPct = first.totalUsd ? (delta / first.totalUsd) * 100 : 0;

  return (
    <figure className="space-y-2">
      <figcaption className="sr-only">
        Patrimonio de {fmtDay(first.day)} a {fmtDay(last.day)}: de {formatMoney(first.totalUsd, "USD")} a {formatMoney(last.totalUsd, "USD")}.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full overflow-visible" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="nw-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--accent))" stopOpacity="0.25" />
            <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + f * (H - PAD.top - PAD.bottom)} y2={PAD.top + f * (H - PAD.top - PAD.bottom)} stroke="rgb(var(--line))" strokeDasharray="3 5" />
        ))}
        <path d={area} fill="url(#nw-area)" className="reveal" />
        <path d={line} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="line-draw" />
        {snapshots.map((s, i) => (
          <circle key={s.day} cx={x(i)} cy={y(s.totalUsd)} r={i === snapshots.length - 1 ? 4.5 : 2.5} fill={i === snapshots.length - 1 ? "rgb(var(--accent))" : "rgb(var(--surface))"} stroke="rgb(var(--accent))" strokeWidth="1.5">
            <title>
              {fmtDay(s.day)}: {formatMoney(s.totalUsd, "USD")}
            </title>
          </circle>
        ))}
        <text x={PAD.left} y={H - 4} className="fill-[rgb(var(--faint))] text-[11px]">
          {fmtDay(first.day)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-[rgb(var(--faint))] text-[11px]">
          {fmtDay(last.day)}
        </text>
      </svg>
      <p className="text-xs text-muted">
        Desde el {fmtDay(first.day)}:{" "}
        <span className={delta >= 0 ? "num font-semibold text-success" : "num font-semibold text-danger"}>
          {delta >= 0 ? "+" : ""}
          {formatMoney(delta, "USD")} ({deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(1)}%)
        </span>
      </p>
    </figure>
  );
}
