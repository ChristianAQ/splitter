import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface RankedRow {
  key: string;
  label: string;
  /** Shown before the label: an icon chip, an avatar... */
  leading?: ReactNode;
  value: number;
  /** A second line under the label. */
  detail?: string;
}

interface Props {
  rows: RankedRow[];
  formatValue: (value: number) => string;
  /** Print each row's share of the total next to its value. */
  showShare?: boolean;
  /** Rows become buttons that open something. */
  onSelect?: (key: string) => void;
}

/**
 * One bar per row, biggest first, all in the same hue: for comparing parts
 * with each other, which bars on a shared baseline do better than slices of
 * a pie or segments laid end to end. The bars are scaled to the largest
 * row; what each row *is* comes from its label and leading mark, never from
 * the bar's color.
 */
export function RankedBars({ rows, formatValue, showShare, onSelect }: Props) {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((r) => r.value), 1);
  const total = sorted.reduce((sum, r) => sum + r.value, 0);

  return (
    <ul className="flex flex-col">
      {sorted.map((r) => {
        const body = (
          <>
            {r.leading}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.label}</span>
                {showShare && total > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{Math.round((r.value / total) * 100)}%</span>
                )}
                <span className="w-[84px] shrink-0 text-right text-sm font-semibold tabular-nums">{formatValue(r.value)}</span>
              </span>
              {r.detail && <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{r.detail}</span>}
              <span className="mt-1.5 block h-1.5 rounded-full bg-neutral-900/[0.06] dark:bg-white/10" aria-hidden>
                <span
                  className="block h-full rounded-r-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
                />
              </span>
            </span>
            {onSelect && <ChevronRight size={15} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />}
          </>
        );
        return (
          <li key={r.key}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(r.key)} className="well-press -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2.5 text-left">
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
