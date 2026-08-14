interface Bar {
  label: string;
  value: number;
}

interface Props {
  bars: Bar[];
  formatValue?: (v: number) => string;
}

/** A minimal, dependency-free bar chart — kept intentionally simple per the
 * "no saturar la pantalla con gráficos" guidance rather than pulling in a
 * charting library for a handful of monthly totals. */
export function BarChart({ bars, formatValue = String }: Props) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    // `items-stretch` (the default) is required here, not `items-end`: each
    // column below relies on actually being stretched to this container's
    // fixed height so its `flex-1` middle div has a real height to resolve
    // the bar's percentage height against — with `items-end` every column
    // shrinks to its own content height instead, and the bar's height ends
    // up computed against ~0px, rendering no visible bar at all.
    <div className="flex items-stretch gap-2.5" style={{ height: 140 }}>
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {bar.value > 0 ? formatValue(bar.value) : ""}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-lg bg-accent-200 dark:bg-accent-800 transition-[height] duration-300"
              style={{ height: `${Math.max(4, (bar.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
