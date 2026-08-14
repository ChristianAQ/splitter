import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDate } from "../../lib/format";
import type { GroupExpense, GroupMember } from "../../types";

interface Props {
  expense: GroupExpense;
  members: Map<string, GroupMember>;
  currentUid: string;
  onClick?: () => void;
}

export function GroupExpenseCard({ expense, members, currentUid, onClick }: Props) {
  const category = categoryById(expense.categoryId);
  const payer = members.get(expense.paidBy);
  const isCreator = expense.createdBy === currentUid;
  const myShare = expense.splits.find((s) => s.uid === currentUid)?.amount ?? 0;

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
          <span>Pagó {payer?.name ?? "—"}</span>
          {!isCreator && (
            <>
              <span aria-hidden>·</span>
              <span aria-label="Solo puede editarlo quien lo creó">🔒</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-semibold tabular-nums">{formatCurrency(expense.amount, expense.currency)}</span>
        <span className="text-xs text-neutral-400">tu parte {formatCurrency(myShare, expense.currency)}</span>
      </div>
    </button>
  );
}
