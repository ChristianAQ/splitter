import { Check } from "lucide-react";
import { SwipeToDelete } from "../ui/SwipeToDelete";
import { categoryById } from "../../lib/categories";
import { dueBucket, dueText, type PaymentProgress } from "../../domain/installments";
import { formatCurrency } from "../../lib/format";
import type { PersonalExpense } from "../../types";

interface Props {
  expense: PersonalExpense;
  progress: PaymentProgress;
  today: string;
  onClick: () => void;
  /** The round check: pays off whatever is left. */
  onPayAll: () => void;
  onDelete: () => Promise<void> | void;
}

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });

/** A row in Próximos: when it's due (as a calendar tile), what it is, and
 * what's left to pay — with a progress line once part has been paid. */
export function UpcomingExpenseCard({ expense, progress, today, onClick, onPayAll, onDelete }: Props) {
  const category = categoryById(expense.categoryId);
  const bucket = dueBucket(expense, today);
  const relative = dueText(expense, today);
  const overdue = bucket === "overdue";
  const partial = progress.paid > 0;
  const date = expense.undated
    ? null
    : new Date(Number(expense.date.slice(0, 4)), Number(expense.date.slice(5, 7)) - 1, Number(expense.date.slice(8)));

  return (
    <SwipeToDelete
      onDelete={onDelete}
      leading={
        <button
          type="button"
          onClick={onPayAll}
          aria-label={`Marcar ${expense.description} como pagado`}
          className="hit-slop pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-transparent active:border-positive active:bg-positive active:text-white dark:border-neutral-600"
        >
          <Check size={15} strokeWidth={3} />
        </button>
      }
    >
      <button type="button" onClick={onClick} className="surface pressable relative block w-full overflow-hidden rounded-[22px] p-3.5 text-left">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none ${
              overdue ? "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark" : "well text-neutral-700 dark:text-neutral-200"
            }`}
          >
            {date ? (
              <>
                <span className="text-[15px] font-semibold tabular-nums">{date.getDate()}</span>
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide opacity-70">{MONTH_SHORT.format(date).replace(".", "")}</span>
              </>
            ) : (
              <category.icon size={19} strokeWidth={1.9} style={{ color: category.color }} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{expense.description}</p>
            <p className={`truncate text-xs ${overdue ? "font-medium text-negative dark:text-negative-dark" : "text-neutral-500 dark:text-neutral-400"}`}>
              {expense.undated ? "Sin fecha" : relative ?? "Programado"}
              <span className="font-normal text-neutral-500 dark:text-neutral-400"> · {category.label}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums">{formatCurrency(progress.remaining, expense.currency)}</p>
            {partial && <p className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">de {formatCurrency(progress.total, expense.currency)}</p>}
          </div>
        </div>
        {partial && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/5 dark:bg-white/10" aria-hidden>
            <div className="h-full rounded-r-full bg-accent transition-[width] duration-500" style={{ width: `${(progress.paid / progress.total) * 100}%` }} />
          </div>
        )}
      </button>
    </SwipeToDelete>
  );
}
