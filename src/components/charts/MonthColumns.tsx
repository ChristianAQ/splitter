interface Column {
  key: string;
  /** Short axis label ("nov"). */
  label: string;
  /** Full name for assistive tech and the table view ("noviembre de 2026"). */
  name: string;
  value: number;
}

interface Props {
  columns: Column[];
  formatValue: (value: number) => string;
  /** Draws a reference line at this value, labelled "Media". */
  average?: number;
  /** With a selection, that column is drawn in the accent hue and the rest
   * step back to grey — the chart's point is "this month, in context". */
  selectedKey?: string;
  onSelect?: (key: string) => void;
  caption: string;
}

const PLOT_HEIGHT = 112;

/**
 * Month-by-month totals as thin columns. One series, so one hue and no
 * legend; the selected month is the only column labelled with its value —
 * the rest are a tap away, and all of them are in the table underneath for
 * screen readers.
 */
export function MonthColumns({ columns, formatValue, average, selectedKey, onSelect, caption }: Props) {
  const max = Math.max(1, average ?? 0, ...columns.map((c) => c.value));
  const hasSelection = selectedKey !== undefined;
  const averageY = average && average > 0 ? (average / max) * PLOT_HEIGHT : null;

  return (
    <figure>
      <div className="relative" aria-hidden={onSelect ? undefined : true}>
        {averageY !== null && (
          // Label on the left: the right-hand end is where the current
          // month — usually the selected, labelled column — sits.
          <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-1.5" style={{ bottom: 22 + averageY }}>
            <span className="-translate-y-px rounded-full bg-surface-light-subtle/80 px-1.5 text-[10px] font-medium text-neutral-500 dark:bg-surface-dark/80 dark:text-neutral-400">
              Media
            </span>
            <span className="h-px flex-1 bg-neutral-900/20 dark:bg-white/25" />
          </div>
        )}
        <div className="flex items-end gap-1" style={{ height: PLOT_HEIGHT + 22 + 18 }}>
          {columns.map((c) => {
            const selected = c.key === selectedKey;
            const height = c.value > 0 ? Math.max((c.value / max) * PLOT_HEIGHT, 3) : 2;
            const body = (
              <>
                <span className={`h-[18px] whitespace-nowrap text-[11px] font-semibold tabular-nums ${selected ? "" : "invisible"}`}>
                  {selected ? formatValue(c.value) : "0"}
                </span>
                <span className="flex w-full flex-1 items-end justify-center border-b border-neutral-900/10 dark:border-white/15">
                  <span
                    className={`block w-full max-w-[22px] rounded-t-[4px] transition-[height,background-color] duration-500 ease-out ${
                      !hasSelection || selected ? "bg-accent" : "bg-neutral-900/[0.14] dark:bg-white/20"
                    } ${c.value > 0 ? "" : "opacity-50"}`}
                    style={{ height }}
                  />
                </span>
                <span
                  className={`flex h-[22px] items-end text-[11px] ${
                    selected ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {c.label}
                </span>
              </>
            );
            const className = "flex h-full min-w-0 flex-1 flex-col items-center";
            return onSelect ? (
              <button
                key={c.key}
                type="button"
                aria-pressed={selected}
                aria-label={`${c.name}: ${formatValue(c.value)}`}
                onClick={() => onSelect(c.key)}
                className={`${className} rounded-lg outline-offset-2 active:opacity-70`}
              >
                {body}
              </button>
            ) : (
              <div key={c.key} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
      {/* The same numbers as a table: every value is readable without
       * tapping through the columns one by one. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {columns.map((c) => (
            <tr key={c.key}>
              <th scope="row">{c.name}</th>
              <td>{formatValue(c.value)}</td>
            </tr>
          ))}
          {average !== undefined && average > 0 && (
            <tr>
              <th scope="row">Media</th>
              <td>{formatValue(average)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </figure>
  );
}
