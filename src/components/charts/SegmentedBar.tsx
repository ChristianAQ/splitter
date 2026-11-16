export interface Segment {
  key: string;
  label: string;
  value: number;
  /** A CSS color — one of the validated series colors (index.css). */
  color: string;
  detail?: string;
}

interface Props {
  segments: Segment[];
  formatValue: (value: number) => string;
}

/**
 * How one total splits into a few parts: a thin bar divided in proportion,
 * with a list underneath that names each part and gives its amount and
 * share — the swatch on each row is the legend. Parts keep their order and
 * their color whether or not they have anything in them this month, so the
 * same thing is always the same color.
 */
export function SegmentedBar({ segments, formatValue }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex h-2 gap-[2px]" aria-hidden>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.key} className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
          ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {segments.map((s) => (
          <li key={s.key} className={`flex items-center gap-2.5 ${s.value > 0 ? "" : "opacity-50"}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{s.label}</span>
              {s.detail && <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{s.detail}</span>}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{Math.round((s.value / total) * 100)}%</span>
            <span className="w-[84px] shrink-0 text-right text-sm font-semibold tabular-nums">{formatValue(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
