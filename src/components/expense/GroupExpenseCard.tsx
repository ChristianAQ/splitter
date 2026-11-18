import { Lock } from "lucide-react";
import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDate } from "../../lib/format";
import { SwipeToDelete } from "../ui/SwipeToDelete";
import type { GroupExpense, GroupMember } from "../../types";

interface Props {
  expense: GroupExpense;
  members: Map<string, GroupMember>;
  currentUid: string;
  onClick?: () => void;
  /** Enables drag-right-to-delete. Only pass it for expenses the current
   * user created — nobody else is allowed to delete them. */
  onDelete?: () => Promise<void> | void;
}

export function GroupExpenseCard({ expense, members, currentUid, onClick, onDelete }: Props) {
  const category = categoryById(expense.categoryId);
  const payer = members.get(expense.paidBy);
  const isCreator = expense.createdBy === currentUid;
  const myShare = expense.splits.find((s) => s.uid === currentUid)?.amount ?? 0;

  const card = (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 surface rounded-[22px] p-3.5 text-left pressable"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
      >
        <category.icon size={20} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{expense.description}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="shrink-0">{formatDate(expense.date)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{expense.paidBy === currentUid ? "Pagaste tú" : `Pagó ${payer?.name ?? "alguien"}`}</span>
          {!isCreator && (
            <>
              <span aria-hidden>·</span>
              <Lock size={11} strokeWidth={2.25} aria-label="Solo puede editarlo quien lo creó" />
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-semibold tabular-nums">{formatCurrency(expense.amount, expense.currency)}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {myShare > 0 ? `tu parte ${formatCurrency(myShare, expense.currency)}` : "no participas"}
        </span>
      </div>
    </button>
  );

  return onDelete ? <SwipeToDelete onDelete={onDelete}>{card}</SwipeToDelete> : card;
}
