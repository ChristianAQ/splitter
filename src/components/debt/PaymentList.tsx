import { Pencil } from "lucide-react";
import { formatCurrency, formatDateLong } from "../../lib/format";
import type { Currency, DebtPayment } from "../../types";

export interface ListedPayment {
  /** Unique within the list. */
  key: string;
  payment: DebtPayment;
  /** What it was a payment of, when the list mixes several entries. */
  context?: string;
  /** "+" / "−" in front of the amount, when direction matters. */
  sign?: string;
}

interface Props {
  title: string;
  items: ListedPayment[];
  currency: Currency;
  /** Tapping a payment opens it for correcting. */
  onEdit: (item: ListedPayment) => void;
}

/** What's been paid so far, newest first — each one tappable, to fix or
 * remove a payment recorded by mistake. */
export function PaymentList({ title, items, currency, onEdit }: Props) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="eyebrow mb-2 px-1">{title}</h4>
      <ul className="well divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
        {[...items]
          .sort((a, b) => b.payment.at - a.payment.at)
          .map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label={`Corregir el pago de ${formatCurrency(item.payment.amount, currency)} del ${formatDateLong(item.payment.date)}`}
                className="well-press flex w-full items-center gap-3 px-4 py-3 text-left text-sm first:rounded-t-[22px] last:rounded-b-[22px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-neutral-700 dark:text-neutral-200">{formatDateLong(item.payment.date)}</span>
                  {item.context && <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{item.context}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {item.sign}
                  {formatCurrency(item.payment.amount, currency)}
                </span>
                <Pencil size={14} strokeWidth={2.1} className="shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden />
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
