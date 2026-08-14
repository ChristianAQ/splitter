import { useId } from "react";
import type { Currency } from "../../types";

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
          autoFocus={autoFocus}
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          size={1}
          style={{ width: `${Math.max((value || "0").length, 1) + 0.75}ch` }}
          className="min-w-0 shrink-0 bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
        />
      </div>
    </div>
  );
}
