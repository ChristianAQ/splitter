import { ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/format";
import { Avatar } from "../ui/Avatar";
import type { GroupMember, Payment } from "../../types";

interface Props {
  payment: Payment;
  members: Map<string, GroupMember>;
  canRevert: boolean;
  onRevert?: () => void;
}

export function PaymentCard({ payment, members, canRevert, onRevert }: Props) {
  const from = members.get(payment.fromUid);
  const to = members.get(payment.toUid);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card dark:bg-surface-dark-subtle">
      <Avatar name={from?.name ?? "?"} color={from?.color ?? "#999"} size="sm" />
      <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
      <Avatar name={to?.name ?? "?"} color={to?.color ?? "#999"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {from?.name} pagó a {to?.name}
        </p>
        <p className="text-xs text-neutral-400">{formatDate(payment.createdAt ? isoFromMillis(payment.createdAt) : "")}</p>
      </div>
      <span className="font-semibold tabular-nums text-positive">{formatCurrency(payment.amount, payment.currency)}</span>
      {canRevert && onRevert && (
        <button
          onClick={onRevert}
          className="ml-1 shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
        >
          Revertir
        </button>
      )}
    </div>
  );
}

function isoFromMillis(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}
