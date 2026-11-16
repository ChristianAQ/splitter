import { Check } from "lucide-react";
import { Badge } from "../ui/Card";
import { SwipeToDelete } from "../ui/SwipeToDelete";
import { dueLabel, dueState, isSettled, remainingAmount } from "../../domain/debts";
import { DEBT_KIND_META, debtRelation, debtTitle } from "../../lib/debts";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Debt } from "../../types";

interface Props {
  debt: Debt;
  today: string;
  onClick: () => void;
  onToggleSettled: () => void;
  onDelete: () => Promise<void> | void;
}

export function DebtCard({ debt, today, onClick, onToggleSettled, onDelete }: Props) {
  const meta = DEBT_KIND_META[debt.kind];
  const settled = isSettled(debt);
  const remaining = remainingAmount(debt);
  const partial = !settled && debt.paidAmount > 0;
  const state = dueState(debt, today);
  const relative = dueLabel(debt, today);
  const progress = settled ? 1 : Math.min(debt.paidAmount / debt.amount, 1);

  const secondary =
    debt.kind === "reminder" ? debt.notes : [debtRelation(debt), debt.concept].filter(Boolean).join(" · ");

  return (
    <SwipeToDelete
      onDelete={onDelete}
      leading={
        <button
          type="button"
          onClick={onToggleSettled}
          aria-label={settled ? "Volver a marcar como pendiente" : "Marcar como saldado"}
          aria-pressed={settled}
          className={`hit-slop pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
            settled ? "border-positive bg-positive text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"
          }`}
        >
          <Check size={15} strokeWidth={3} />
        </button>
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={`surface pressable relative block w-full overflow-hidden rounded-[22px] p-3.5 text-left ${settled ? "opacity-60" : ""}`}
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.chip}`}>
            <meta.icon size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${settled ? "line-through decoration-neutral-400/70" : ""}`}>{debtTitle(debt)}</p>
            {secondary && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{secondary}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {settled ? (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Saldado</span>
              ) : state === "overdue" ? (
                <Badge tone="negative">{relative ?? `Venció el ${formatDate(debt.dueDate!)}`}</Badge>
              ) : state === "today" || state === "soon" ? (
                <Badge tone="warning">{relative}</Badge>
              ) : debt.dueDate ? (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{relative ?? `Vence el ${formatDate(debt.dueDate)}`}</span>
              ) : (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Sin fecha · cuando se pueda</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-semibold tabular-nums ${settled ? "text-neutral-500 dark:text-neutral-400" : meta.amount}`}>
              {formatCurrency(settled ? debt.amount : remaining, debt.currency)}
            </p>
            {partial && <p className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">de {formatCurrency(debt.amount, debt.currency)}</p>}
          </div>
        </div>
        {partial && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/5 dark:bg-white/10" aria-hidden>
            <div className="h-full rounded-r-full bg-accent transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </button>
    </SwipeToDelete>
  );
}
