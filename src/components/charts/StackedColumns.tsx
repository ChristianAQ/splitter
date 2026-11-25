import type { ReactNode } from "react";
import { ChartLegend, ChartTooltip } from "./ChartTooltip";
import { useScrub } from "./useScrub";

export interface StackSeries {
  key: string;
  label: string;
  /** A CSS color: one of the validated series tokens or the accent. */
  color: string;
}

export interface StackColumn {
  key: string;
  /** Short axis label ("nov"). */
  label: string;
  /** Full name, for the tooltip and the table ("noviembre de 2026"). */
  name: string;
  values: Record<string, number>;
  /** Extra line for the tooltip. */
  note?: ReactNode;
  /** Draws a small marker under the column's label. */
  marked?: boolean;
}

interface Props {
  columns: StackColumn[];
  /** Bottom to top. */
  series: StackSeries[];
  formatValue: (value: number) => string;
  /** That column is drawn in full and labelled; the others step back. */
  selectedKey?: string;
  /** Tapping a column picks it. */
  onSelect?: (key: string) => void;
  caption: string;
  height?: number;
  /** What a marked column means, added to the legend. */
  markerLabel?: string;
}

/**
 * Columns split into stacked parts — what a total is made of, period by
 * period. Slide a finger (or the mouse) across it for each column's
 * breakdown; arrow keys do the same with the chart focused.
 */
export function StackedColumns({ columns, series, formatValue, selectedKey, onSelect, caption, height = 120, markerLabel }: Props) {
  const selectedIndex = selectedKey ? columns.findIndex((c) => c.key === selectedKey) : -1;
  const { ref, active, handlers } = useScrub(columns.length, "band", selectedIndex >= 0 ? selectedIndex : undefined);
  const totals = columns.map((c) => series.reduce((sum, s) => sum + (c.values[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const focusIndex = active ?? (selectedIndex >= 0 ? selectedIndex : null);
  const shown = active !== null ? columns[active] : null;

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
        {markerLabel && (
          <span className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-white" />
            {markerLabel}
          </span>
        )}
      </div>
      <div
        ref={ref}
        {...handlers}
        onClick={() => {
          if (onSelect && active !== null) onSelect(columns[active].key);
        }}
        onKeyDownCapture={(e) => {
          if (onSelect && active !== null && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect(columns[active].key);
          }
        }}
        tabIndex={0}
        role="group"
        aria-label={`${caption}. Usa las flechas para recorrerlo.`}
        className="relative cursor-pointer select-none rounded-lg outline-offset-4"
        style={{ touchAction: "pan-y", WebkitTapHighlightColor: "transparent" }}
      >
        {shown && active !== null && (
          <ChartTooltip
            title={shown.name}
            x={(active + 0.5) / columns.length}
            rows={[
              ...[...series].reverse().map((s) => ({ key: s.key, label: s.label, value: formatValue(shown.values[s.key] ?? 0), color: s.color })),
              ...(series.length > 1 ? [{ key: "__total", label: "Total", value: formatValue(totals[active]) }] : []),
            ]}
            footer={shown.note}
          />
        )}
        <div className="flex items-end gap-1" style={{ height: height + 18 + 22 }}>
          {columns.map((c, i) => {
            const total = totals[i];
            const emphasized = focusIndex === null || focusIndex === i;
            const labelled = selectedIndex === i && active === null;
            const parts = series.filter((s) => (c.values[s.key] ?? 0) > 0);
            const columnHeight = total > 0 ? Math.max((total / max) * height, 4) : 2;
            return (
              <div key={c.key} className="flex h-full min-w-0 flex-1 flex-col items-center">
                <span className={`h-[18px] whitespace-nowrap text-[11px] font-semibold tabular-nums ${labelled ? "" : "invisible"}`}>
                  {labelled ? formatValue(total) : "0"}
                </span>
                <span className="flex w-full flex-1 items-end justify-center border-b border-neutral-900/10 dark:border-white/15">
                  <span
                    className={`flex w-full max-w-[22px] flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] transition-[height,opacity] duration-500 ease-out ${
                      emphasized ? "" : "opacity-40"
                    }`}
                    style={{ height: columnHeight }}
                  >
                    {total <= 0 ? (
                      <span className="block h-full w-full bg-neutral-900/10 dark:bg-white/15" />
                    ) : (
                      parts.map((s) => (
                        <span
                          key={s.key}
                          className="block w-full shrink-0"
                          style={{
                            // The 2px gaps come out of the column's height, so
                            // parts are sized as a share of what's left.
                            height: `calc((100% - ${(parts.length - 1) * 2}px) * ${(c.values[s.key] ?? 0) / total})`,
                            minHeight: 2,
                            backgroundColor: s.color,
                          }}
                        />
                      ))
                    )}
                  </span>
                </span>
                <span
                  className={`relative flex h-[22px] items-end text-[11px] ${
                    focusIndex === i ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {c.label}
                  {c.marked && <span aria-hidden className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white" />}
                </span>
              </div>
            );
          })}
        </div>
        {columns.some((c) => c.marked) && <div className="h-2" />}
      </div>
      {/* The sr-only box is a div, not the table itself: a table can't be
       * squeezed to 1px, so an sr-only <table> keeps its full width and
       * makes the page wider than the screen (pannable sideways on iOS). */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Periodo</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c, i) => (
              <tr key={c.key}>
                <th scope="row">{c.name}</th>
                {series.map((s) => (
                  <td key={s.key}>{formatValue(c.values[s.key] ?? 0)}</td>
                ))}
                <td>{formatValue(totals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
