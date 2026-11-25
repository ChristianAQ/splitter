import { useId } from "react";
import { Wallet } from "lucide-react";
import { summarizeRecurringBudget } from "../../domain/budget";
import { useAvailableMoney } from "../../hooks/useAvailableMoney";
import { formatSignedCurrency } from "../../lib/format";
import type { Currency, RecurringExpense } from "../../types";

interface Props {
  recurring: RecurringExpense[];
  month: string; // "YYYY-MM"
  uid?: string;
  currency: Currency;
}

const SYMBOL: Record<Currency, string> = { EUR: "€", USD: "$", GBP: "£" };

/** The money available this month against the fixed expenses: one line to
 * type it in, one line with what's left once they're all paid. Remembered
 * per month on this device (useAvailableMoney). */
export function RecurringBudgetCard({ recurring, month, uid, currency }: Props) {
  const { raw, setAvailable } = useAvailableMoney(uid, month);
  const id = useId();
  const available = parseFloat(raw.replace(",", ".")) || 0;
  const summary = summarizeRecurringBudget(recurring, month, available);
  const hasAvailable = raw.trim() !== "";

  function handleChange(value: string) {
    const normalized = value.replace(",", ".");
    if (/^\d*\.?\d{0,2}$/.test(normalized)) setAvailable(normalized);
  }

  if (recurring.length === 0) return null;
  const positive = summary.projectedLeftover >= 0;

  return (
    <div className="surface rounded-[22px]">
      <label htmlFor={id} className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
          <Wallet size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">Disponible</span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{hasAvailable ? "Lo que tienes este mes" : "Para ver lo que te sobra"}</span>
        </span>
        <span className="well flex items-center gap-1 rounded-xl px-3 py-1.5">
          <input
            id={id}
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="0"
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-[76px] bg-transparent text-right font-semibold tabular-nums outline-none placeholder:text-neutral-400"
          />
          <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{SYMBOL[currency]}</span>
        </span>
      </label>
      {hasAvailable && (
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
          <span className="min-w-0">
            <span className="block text-sm font-medium">Te sobrará</span>
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              Ahora mismo te quedan{" "}
              <span className={`font-semibold ${summary.remainingNow >= 0 ? "" : "text-negative dark:text-negative-dark"}`}>
                {formatSignedCurrency(summary.remainingNow, currency)}
              </span>
            </span>
          </span>
          <span
            className={`shrink-0 text-[19px] font-semibold tabular-nums ${positive ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"}`}
          >
            {formatSignedCurrency(summary.projectedLeftover, currency)}
          </span>
        </div>
      )}
    </div>
  );
}
