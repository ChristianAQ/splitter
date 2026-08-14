import { formatSignedCurrency } from "../../lib/format";
import { UserColorIndicator } from "../ui/Avatar";
import type { Currency, GroupMember, MemberBalance } from "../../types";

interface Props {
  member: GroupMember;
  balance: MemberBalance;
  currency: Currency;
}

export function BalanceRow({ member, balance, currency }: Props) {
  const settled = Math.abs(balance.net) < 0.005;
  return (
    <div className="flex items-center justify-between py-2.5">
      <UserColorIndicator name={member.name} color={member.color} />
      <span className={`font-semibold tabular-nums ${settled ? "text-neutral-400" : balance.net > 0 ? "text-positive" : "text-negative"}`}>
        {settled ? "Saldado" : formatSignedCurrency(balance.net, currency)}
      </span>
    </div>
  );
}
