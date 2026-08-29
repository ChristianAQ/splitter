import { Check, Repeat } from "lucide-react";
import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDate } from "../../lib/format";
import { Badge } from "../ui/Card";
import type { PersonalExpense } from "../../types";

interface Props {
  expense: PersonalExpense;
  onClick?: () => void;
  onMarkDone?: () => void;
}

export function PersonalExpenseCard({ expense, onClick, onMarkDone }: Props) {
  const category = categoryById(expense.categoryId);
  return (
    <div className="flex items-center gap-2">
      {onMarkDone && (
        <button
          type="button"
          onClick={onMarkDone}
          aria-label="Marcar como realizado"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-transparent active:scale-95 active:bg-positive/10 dark:border-neutral-600"
        >
          <Check size={15} strokeWidth={3} />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex w-full min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card active:scale-[0.99] transition-transform dark:bg-surface-dark-subtle"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <category.icon size={20} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{expense.description}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{formatDate(expense.date)}</span>
            <span aria-hidden>·</span>
            <span>{category.label}</span>
            {expense.recurringSourceId && (
              <>
                <span aria-hidden>·</span>
                <Repeat size={12} strokeWidth={2.2} aria-label="Gasto recurrente" />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold tabular-nums">{formatCurrency(expense.amount, expense.currency)}</span>
          {expense.status === "future" && <Badge tone="accent">Próximo</Badge>}
        </div>
      </button>
    </div>
  );
}
