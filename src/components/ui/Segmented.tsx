interface Props<T extends string> {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}

/** Segmented control with one shared thumb that glides to the selected
 * option (same idea as the tab bar's pill) instead of each option
 * repainting its own background. Options are equal-width, so the thumb's
 * position is plain arithmetic — no measuring. */
export function Segmented<T extends string>({ options, value, onChange, className = "", label }: Props<T>) {
  const index = Math.max(
    options.findIndex(([key]) => key === value),
    0
  );

  return (
    <div role="tablist" aria-label={label} className={`well relative flex rounded-full p-1 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      >
        <div className="h-full w-full rounded-full bg-white shadow-[0_1px_2px_rgb(20_22_40/0.08),0_6px_14px_-8px_rgb(20_22_40/0.35)] dark:bg-white/[0.16] dark:shadow-none" />
      </div>
      {options.map(([key, text]) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`relative z-10 min-w-0 flex-1 truncate rounded-full px-1 py-2 text-[13px] font-semibold transition-colors duration-200 ${
              selected ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
