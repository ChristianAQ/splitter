import { ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/format";
import { localISO } from "../../domain/date";
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
    <div className="flex items-center gap-3 surface rounded-[22px] p-3.5">
      <Avatar name={from?.name ?? "?"} color={from?.color ?? "#999"} photoUrl={from?.photoUrl} size="sm" />
      <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
      <Avatar name={to?.name ?? "?"} color={to?.color ?? "#999"} photoUrl={to?.photoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {from?.name} pagó a {to?.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(payment.createdAt ? isoFromMillis(payment.createdAt) : "")}</p>
      </div>
      <span className="font-semibold tabular-nums text-positive">{formatCurrency(payment.amount, payment.currency)}</span>
      {canRevert && onRevert && (
        <button
          onClick={onRevert}
          className="ml-1 shrink-0 rounded-full well px-2.5 py-1 text-xs font-semibold text-neutral-500 well-press dark:text-neutral-400"
        >
          Revertir
        </button>
      )}
    </div>
  );
}

function isoFromMillis(millis: number): string {
  return localISO(new Date(millis));
}
