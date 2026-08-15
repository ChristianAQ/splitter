import { useEffect, useId, useRef } from "react";
import type { Currency } from "../../types";

// BottomSheet's slide-up animation runs for 0.22s (see index.css). Focusing
// natively (via the `autoFocus` HTML attribute) fires the instant the input
// mounts, i.e. mid-animation — iOS then opens the keyboard and computes the
// scroll-into-view position against the sheet's still-animating layout,
// landing the viewport at an arbitrary mid-scroll position instead of the
// top. Delaying the focus call until just after the animation settles fixes
// this without touching the animation itself.
const AUTOFOCUS_DELAY_MS = 300;

const CURRENCY_SYMBOL: Record<Currency, string> = { EUR: "€", USD: "$", GBP: "£" };

interface Props {
  value: string;
  onChange: (raw: string) => void;
  currency?: Currency;
  label?: string;
  autoFocus?: boolean;
  large?: boolean;
}

/** A big, thumb-friendly amount field. Accepts free typing but only lets
 * through digits and a single decimal separator so the value is always a
 * parseable number string. */
export function AmountInput({ value, onChange, currency = "EUR", label, autoFocus, large }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), AUTOFOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  function handleChange(raw: string) {
    const normalized = raw.replace(",", ".");
    if (/^\d*\.?\d{0,2}$/.test(normalized)) onChange(normalized);
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </label>
      )}
      <div className={`flex items-baseline justify-center gap-1 ${large ? "text-5xl" : "text-3xl"} font-bold tabular-nums`}>
        <span className="text-neutral-400 dark:text-neutral-500">{CURRENCY_SYMBOL[currency]}</span>
        <input
          id={id}
          ref={inputRef}
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          size={1}
          style={{ width: `${Math.max((value || "0").length, 1) + 0.75}ch` }}
          // Global `input { font-size: 16px }` (index.css, prevents iOS
          // Safari zooming on focus for normal-sized fields) otherwise
          // overrides this element's inherited text-5xl/text-3xl — an
          // element selector still beats an ancestor's class for
          // inheritance purposes, so the number renders at a fixed 16px
          // while the currency symbol next to it renders at full size.
          // Repeating the same size class directly on the input (higher
          // specificity than a bare element selector) restores it; both
          // sizes stay well above 16px, so the zoom-prevention rule's own
          // purpose isn't undermined here.
          className={`min-w-0 shrink-0 bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 ${large ? "text-5xl" : "text-3xl"}`}
        />
      </div>
    </div>
  );
}
