import { useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AmountInput } from "../components/ui/AmountInput";
import { Button } from "../components/ui/Button";
import { toMinorUnits } from "../domain/money";
import { formatCurrency } from "../lib/format";
import type { Currency } from "../types";

interface Options {
  /** What's still outstanding. */
  remaining: number;
  currency: Currency;
  /** The sheet's title for this step: "¿Cuánto le devuelves?"... */
  question: string;
  /** Goes on the confirm button in front of the amount: "Devolver", "Pagar"... */
  verb: string;
  busy: boolean;
  onBack: () => void;
  /** `coversAll` is true when the amount entered pays off everything left. */
  onConfirm: (amount: number, coversAll: boolean) => void;
}

/**
 * The "pay part of it" step shared by debts and upcoming expenses: one
 * question, one amount, quick "half"/"all" choices, a live line saying what
 * will be left afterwards, and a button that states exactly what it records.
 *
 * Returned as the title/children/footer of a sheet rather than as a
 * component, so the caller can swap them into the sheet that's already open
 * instead of closing it and opening another.
 */
export function usePartialPayment({ remaining, currency, question, verb, busy, onBack, onConfirm }: Options): {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  reset: () => void;
} {
  const [amount, setAmount] = useState("");

  const value = parseFloat(amount);
  const valueMinor = value > 0 ? toMinorUnits(value, currency) : 0;
  const remainingMinor = toMinorUnits(remaining, currency);
  const tooMuch = valueMinor > remainingMinor;
  const coversAll = valueMinor > 0 && valueMinor >= remainingMinor;
  const leftAfter = (remainingMinor - Math.min(valueMinor, remainingMinor)) / 100;
  const ready = value > 0 && !tooMuch;
  const chip = "well well-press pressable rounded-full px-3.5 py-2 text-[13px] font-semibold text-neutral-700 dark:text-neutral-200";

  return {
    title: question,
    reset: () => setAmount(""),
    footer: (
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          <ArrowLeft size={17} strokeWidth={2.2} />
          Volver
        </Button>
        <Button className="flex-1" onClick={() => ready && onConfirm(value, coversAll)} loading={busy} disabled={!ready}>
          {ready ? `${verb} ${formatCurrency(value, currency)}` : verb}
        </Button>
      </div>
    ),
    children: (
      <div className="flex flex-col gap-5 pb-2 pt-3">
        <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus large />

        <div className="flex justify-center gap-2">
          {remainingMinor >= 2 && (
            <button type="button" onClick={() => setAmount(String(Math.round(remainingMinor / 2) / 100))} className={chip}>
              La mitad
            </button>
          )}
          <button type="button" onClick={() => setAmount(String(remaining))} className={chip}>
            Todo · {formatCurrency(remaining, currency)}
          </button>
        </div>

        <p
          className={`rounded-[18px] px-4 py-3 text-center text-sm ${
            tooMuch
              ? "bg-negative/10 text-negative dark:text-negative-dark"
              : coversAll
                ? "bg-positive/10 text-positive dark:text-positive-dark"
                : "well text-neutral-600 dark:text-neutral-300"
          }`}
          aria-live="polite"
        >
          {tooMuch ? (
            <>Solo quedan {formatCurrency(remaining, currency)} pendientes.</>
          ) : coversAll ? (
            <>Con esto queda saldado del todo.</>
          ) : value > 0 ? (
            <>
              Después quedarán <span className="font-semibold">{formatCurrency(leftAfter, currency)}</span> pendientes.
            </>
          ) : (
            <>
              Ahora mismo quedan <span className="font-semibold">{formatCurrency(remaining, currency)}</span> pendientes.
            </>
          )}
        </p>
      </div>
    ),
  };
}
