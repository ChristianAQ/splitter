import { useState, type ReactNode } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AmountInput } from "../components/ui/AmountInput";
import { Button } from "../components/ui/Button";
import { toMinorUnits } from "../domain/money";
import { formatCurrency, formatDateLong } from "../lib/format";
import type { Currency, DebtPayment } from "../types";

interface Options {
  currency: Currency;
  busy: boolean;
  onBack: () => void;
  /** The most the payment being edited can be (the debt's total minus the others). */
  maxFor: (payment: DebtPayment) => number;
  onSave: (payment: DebtPayment, amount: number) => void;
  onDelete: (payment: DebtPayment) => void;
}

/**
 * Fixing a payment recorded by mistake: change its amount, or take it out
 * altogether. Like usePartialPayment, it hands back the title/children/
 * footer of a sheet so the caller can show it inside the one already open.
 */
export function usePaymentEditor({ currency, busy, onBack, maxFor, onSave, onDelete }: Options): {
  /** The payment being corrected, or null when the editor is closed. */
  payment: DebtPayment | null;
  open: (payment: DebtPayment) => void;
  close: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
} {
  const [payment, setPayment] = useState<DebtPayment | null>(null);
  const [amount, setAmount] = useState("");

  const value = parseFloat(amount);
  const max = payment ? maxFor(payment) : 0;
  const tooMuch = value > 0 && toMinorUnits(value, currency) > toMinorUnits(max, currency);
  const changed = payment !== null && value > 0 && toMinorUnits(value, currency) !== toMinorUnits(payment.amount, currency);

  return {
    payment,
    open: (p) => {
      setPayment(p);
      setAmount(String(p.amount));
    },
    close: () => setPayment(null),
    title: "Corregir pago",
    footer: (
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} disabled={busy} aria-label="Volver">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </Button>
        <Button variant="ghost" className="!text-negative" onClick={() => payment && onDelete(payment)} disabled={busy}>
          <Trash2 size={16} strokeWidth={2.1} />
          Quitar
        </Button>
        <Button className="flex-1" onClick={() => payment && changed && !tooMuch && onSave(payment, value)} loading={busy} disabled={!changed || tooMuch}>
          Guardar
        </Button>
      </div>
    ),
    children: payment && (
      <div className="flex flex-col gap-4 pb-2 pt-3">
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">Pago del {formatDateLong(payment.date)}</p>
        <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus large />
        <p
          className={`rounded-[18px] px-4 py-3 text-center text-sm ${
            tooMuch ? "bg-negative/10 text-negative dark:text-negative-dark" : "well text-neutral-600 dark:text-neutral-300"
          }`}
          aria-live="polite"
        >
          {tooMuch
            ? `Como mucho ${formatCurrency(max, currency)}: es lo que quedaba por pagar.`
            : "Cambia el importe si te equivocaste, o quítalo si no llegó a hacerse."}
        </p>
      </div>
    ),
  };
}
