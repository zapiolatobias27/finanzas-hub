import { CLASSES, GROUP_LABEL, type Allocation, type AssetClass, type ClassGroup, type Scenario } from "@/lib/consulting/engine";

// Canales RGB de cada grupo (tokens del tema; cripto usa un violeta propio).
const GROUP_RGB: Record<ClassGroup, string> = {
  liquidez: "var(--accent-3)",
  pesos: "var(--info)",
  dolares: "var(--accent-2)",
  variable: "var(--accent)",
  cripto: "124 58 237",
};
const rgb = (g: ClassGroup, alpha = 1) => (alpha === 1 ? `rgb(${GROUP_RGB[g]})` : `rgb(${GROUP_RGB[g]} / ${alpha})`);

export const GROUP_COLOR = Object.fromEntries(Object.keys(GROUP_RGB).map((g) => [g, rgb(g as ClassGroup)])) as Record<ClassGroup, string>;

/** Color de cada clase: el de su grupo, con distinta intensidad dentro del grupo. */
export function classColor(c: AssetClass): string {
  const shades: Partial<Record<AssetClass, number>> = { cer: 0.6, ons: 0.7, soberanos: 0.45, acciones_arg: 0.6 };
  return rgb(CLASSES[c].group, shades[c] ?? 1);
}

const fmt = (v: number, currency: "ARS" | "USD") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
const compact = (v: number, currency: "ARS" | "USD") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);

/* ───────── Sankey: monto → categorías → instrumentos ───────── */

const W = 900;
const H = 470;
const NODE_W = 14;
const GAP = 22;
const X = { total: 0, group: 300, cls: 600 };

interface Node {
  key: string;
  label: string;
  value: number;
  y0: number;
  y1: number;
  color: string;
}

function layout<T extends { key: string; label: string; value: number; color: string }>(items: T[], gap: number): (T & Node)[] {
  const usable = H - gap * Math.max(0, items.length - 1);
  let y = 0;
  return items.map((it) => {
    const h = Math.max(2, it.value * usable);
    const node = { ...it, y0: y, y1: y + h };
    y += h + gap;
    return node;
  });
}

function band(x0: number, a0: number, a1: number, x1: number, b0: number, b1: number) {
  const xm = (x0 + x1) / 2;
  return `M${x0},${a0} C${xm},${a0} ${xm},${b0} ${x1},${b0} L${x1},${b1} C${xm},${b1} ${xm},${a1} ${x0},${a1} Z`;
}

export function MoneySankey({ allocations, amount, currency }: { allocations: Allocation[]; amount: number; currency: "ARS" | "USD" }) {
  const groupOrder: ClassGroup[] = ["liquidez", "pesos", "dolares", "variable", "cripto"];
  const groups = layout(
    groupOrder
      .map((g) => ({ key: g, label: GROUP_LABEL[g], value: allocations.filter((a) => CLASSES[a.assetClass].group === g).reduce((s, a) => s + a.weight, 0), color: GROUP_COLOR[g] }))
      .filter((g) => g.value > 0),
    GAP * 1.5,
  );
  const classes = layout(
    groups.flatMap((g) =>
      allocations
        .filter((a) => CLASSES[a.assetClass].group === g.key)
        .map((a) => ({ key: a.assetClass, label: CLASSES[a.assetClass].label, value: a.weight, color: classColor(a.assetClass), group: g.key, amount: a.amount })),
    ),
    GAP,
  );

  // Segmentos del nodo total y de cada grupo, en el mismo orden que los destinos.
  let tCursor = 0;
  const totalLinks = groups.map((g) => {
    const h = g.y1 - g.y0;
    const seg = { a0: tCursor, a1: tCursor + h, g };
    tCursor += h;
    return seg;
  });
  const totalH = tCursor;
  const totalOffset = (H - totalH) / 2;
  const groupCursor: Record<string, number> = Object.fromEntries(groups.map((g) => [g.key, g.y0]));

  return (
    <figure>
      <svg viewBox={`-4 -4 ${W + 8} ${H + 30}`} className="h-auto w-full" role="img" aria-label="Diagrama de cómo se reparte tu dinero">
        {/* total → grupos */}
        {totalLinks.map(({ a0, a1, g }, i) => (
          <path
            key={g.key}
            d={band(X.total + NODE_W, a0 + totalOffset, a1 + totalOffset, X.group, g.y0, g.y1)}
            style={{ fill: g.color, fillOpacity: 0.22, animationDelay: `${i * 90}ms` }}
            className="reveal"
          />
        ))}
        {/* grupos → clases */}
        {classes.map((c, i) => {
          const g = groups.find((x) => x.key === c.group)!;
          // Del lado del grupo, la banda ocupa la proporción de la clase dentro de su grupo.
          const h = (c.value / g.value) * (g.y1 - g.y0);
          const start = groupCursor[g.key];
          groupCursor[g.key] = start + h;
          return (
            <path
              key={c.key}
              d={band(X.group + NODE_W, start, start + h, X.cls, c.y0, c.y1)}
              style={{ fill: c.color, fillOpacity: 0.35, animationDelay: `${300 + i * 70}ms` }}
              className="reveal"
            >
              <title>{`${c.label}: ${Math.round(c.value * 100)}%`}</title>
            </path>
          );
        })}

        {/* nodos */}
        <rect x={X.total} y={totalOffset} width={NODE_W} height={totalH} rx={4} style={{ fill: "rgb(var(--ink))" }} />
        {groups.map((g) => (
          <g key={g.key}>
            <rect x={X.group} y={g.y0} width={NODE_W} height={g.y1 - g.y0} rx={4} style={{ fill: g.color }} />
            <text x={X.group - 8} y={(g.y0 + g.y1) / 2} textAnchor="end" dominantBaseline="middle" className="text-[13px] font-semibold" style={{ fill: "rgb(var(--ink))" }}>
              {g.label} · {Math.round(g.value * 100)}%
            </text>
          </g>
        ))}
        {classes.map((c) => (
          <g key={c.key}>
            <rect x={X.cls} y={c.y0} width={NODE_W} height={c.y1 - c.y0} rx={4} style={{ fill: c.color }} />
            <text x={X.cls + NODE_W + 10} y={(c.y0 + c.y1) / 2 - 7} dominantBaseline="middle" className="text-[13px] font-semibold" style={{ fill: "rgb(var(--ink))" }}>
              {c.label}
            </text>
            <text x={X.cls + NODE_W + 10} y={(c.y0 + c.y1) / 2 + 9} dominantBaseline="middle" className="text-[12px]" style={{ fill: "rgb(var(--muted))" }}>
              {Math.round(c.value * 100)}% · {fmt(c.amount, currency)}
            </text>
          </g>
        ))}
        <text x={X.total + NODE_W + 8} y={totalOffset - 10} className="text-[13px] font-semibold" style={{ fill: "rgb(var(--ink))" }}>
          {compact(amount, currency)}
        </text>
      </svg>
    </figure>
  );
}

/* ───────── Torta + tabla ───────── */

export function AllocationDonut({ allocations, currency }: { allocations: Allocation[]; currency: "ARS" | "USD" }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
      <svg viewBox="0 0 180 180" className="mx-auto h-44 w-44 -rotate-90" role="img" aria-label="Distribución de la cartera">
        <circle cx="90" cy="90" r={R} fill="none" strokeWidth="24" style={{ stroke: "rgb(var(--track))" }} />
        {allocations.map((a, i) => {
          const len = a.weight * C;
          const el = (
            <circle
              key={a.assetClass}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              strokeWidth="24"
              strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
              strokeDashoffset={-offset}
              className="reveal"
              style={{ stroke: classColor(a.assetClass), animationDelay: `${i * 80}ms` }}
            >
              <title>{`${CLASSES[a.assetClass].label}: ${Math.round(a.weight * 100)}%`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      <table className="w-full text-sm">
        <caption className="sr-only">Cuánto va a cada tipo de activo</caption>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.assetClass} className="border-t first:border-t-0">
              <td className="py-2 pr-2">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: classColor(a.assetClass) }} aria-hidden="true" />
                  {CLASSES[a.assetClass].label}
                </span>
              </td>
              <td className="num py-2 text-right text-muted">{Math.round(a.weight * 100)}%</td>
              <td className="num py-2 pl-3 text-right font-semibold">{fmt(a.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Escenarios ───────── */

export function ScenarioRanges({ scenarios, amount, currency }: { scenarios: Scenario[]; amount: number; currency: "ARS" | "USD" }) {
  const max = Math.max(...scenarios.map((s) => s.good));
  const min = Math.min(amount * 0.6, ...scenarios.map((s) => s.bad));
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="space-y-5">
      {scenarios.map((s, i) => (
        <div key={s.years} className="reveal space-y-2" style={{ "--i": i } as React.CSSProperties}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              En {s.years} {s.years === 1 ? "año" : "años"}
            </span>
            <span className="num text-muted">
              base <span className="font-semibold text-ink">{fmt(s.base, currency)}</span>
            </span>
          </div>
          <div className="relative h-8 rounded-xl bg-track">
            <span className="absolute inset-y-0 w-px bg-ink/30" style={{ left: pos(amount) }} title="Lo que invertís hoy" aria-hidden="true" />
            <span
              className="bar-fill absolute inset-y-1.5 rounded-lg bg-gradient-to-r from-danger/50 via-accent-2/60 to-success/70"
              style={{ left: pos(s.bad), width: `calc(${pos(s.good)} - ${pos(s.bad)})`, animationDelay: `${i * 120}ms` }}
            />
            <span className="absolute inset-y-0.5 w-1 -translate-x-1/2 rounded-full bg-ink" style={{ left: pos(s.base) }} aria-hidden="true" />
          </div>
          <div className="flex justify-between text-xs">
            <span className="num text-danger">Malo: {fmt(s.bad, currency)}</span>
            <span className="num text-success">Bueno: {fmt(s.good, currency)}</span>
          </div>
        </div>
      ))}
      <p className="text-xs text-faint">
        Simulación con supuestos de rendimiento y volatilidad por tipo de activo, en dólares. &quot;Malo&quot; y &quot;bueno&quot; son 1 de cada 10 casos hacia cada lado. La línea fina marca lo que invertís hoy. No es una promesa de resultados.
      </p>
    </div>
  );
}
