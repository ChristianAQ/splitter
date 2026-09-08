import type { ReactNode } from "react";
import { formatCurrency, formatSignedCurrency } from "../../lib/format";
import { UserColorIndicator } from "../ui/Avatar";
import type { Currency, GroupMember, MemberBalance } from "../../types";

interface Props {
  member: GroupMember;
  balance: MemberBalance;
  currency: Currency;
  action?: ReactNode;
  showPaid?: boolean;
}

export function BalanceRow({ member, balance, currency, action, showPaid }: Props) {
  const settled = Math.abs(balance.net) < 0.005;
  return (
    <div className="flex items-center justify-between py-2.5">
      <UserColorIndicator
        name={member.name}
        color={member.color}
        photoUrl={member.photoUrl}
        badge={member.isGhost ? "Sin cuenta" : undefined}
      />
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <div className="flex flex-col items-end">
          <span className={`font-semibold tabular-nums ${settled ? "text-neutral-400" : balance.net > 0 ? "text-positive" : "text-negative"}`}>
            {settled ? "Saldado" : formatSignedCurrency(balance.net, currency)}
          </span>
          {showPaid && (
            <span className="text-xs text-neutral-400">Pagó {formatCurrency(balance.paid, currency)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
