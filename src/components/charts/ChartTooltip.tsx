import type { ReactNode } from "react";

export interface TooltipRow {
  key: string;
  label: string;
  value: string;
  /** CSS color of the series' mark — drawn as a short line key. */
  color?: string;
  /** Dashed key, for a series drawn as a dashed line. */
  dashed?: boolean;
}

interface Props {
  title: string;
  rows: TooltipRow[];
  /** Horizontal anchor as a fraction of the chart's width (0..1). */
  x: number;
  footer?: ReactNode;
}

/**
 * The readout that appears while scrubbing a chart. Floats just above the
 * plot (so it never covers the marks being read), centred on the data
 * position and kept inside the chart's edges. Values lead (strong), series
 * names follow.
 */
export function ChartTooltip({ title, rows, x, footer }: Props) {
  return (
    <div
      role="status"
      className="glass pointer-events-none absolute bottom-full z-20 mb-2 w-max min-w-[150px] max-w-[200px] -translate-x-1/2 rounded-2xl px-3 py-2 text-left animate-fade-in"
      style={{ left: `clamp(100px, ${x * 100}%, calc(100% - 100px))` }}
    >
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs">
            {r.color && (
              <span
                aria-hidden
                className="h-0 w-3 shrink-0 rounded-full border-t-2"
                style={{ borderColor: r.color, borderTopStyle: r.dashed ? "dashed" : "solid" }}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-neutral-500 dark:text-neutral-400">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t border-black/[0.07] pt-1.5 text-[11px] text-neutral-600 dark:border-white/10 dark:text-neutral-300">{footer}</div>}
    </div>
  );
}

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** "bar" for columns/areas, "line" for lines. */
  shape?: "bar" | "line";
  dashed?: boolean;
}

/** Names every series on a chart; the key mirrors the mark. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          {i.shape === "line" ? (
            <span aria-hidden className="h-0 w-3.5 rounded-full border-t-2" style={{ borderColor: i.color, borderTopStyle: i.dashed ? "dashed" : "solid" }} />
          ) : (
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
