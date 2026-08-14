import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDate } from "../../lib/format";
import { Badge } from "../ui/Card";
import type { PersonalExpense } from "../../types";

interface Props {
  expense: PersonalExpense;
  onClick?: () => void;
}

export function PersonalExpenseCard({ expense, onClick }: Props) {
  const category = categoryById(expense.categoryId);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card active:scale-[0.99] transition-transform dark:bg-surface-dark-subtle"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl dark:bg-neutral-800">
        {category.icon}
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
              <span>🔁</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold tabular-nums">{formatCurrency(expense.amount, expense.currency)}</span>
        {expense.status === "future" && <Badge tone="accent">Próximo</Badge>}
      </div>
    </button>
  );
}
