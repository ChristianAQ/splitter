import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatSignedCurrency } from "../../lib/format";
import { groupIconComponent } from "../../lib/groupIcons";
import type { Currency } from "../../types";

interface Props {
  groupId: string;
  name: string;
  icon: string;
  color: string;
  balance: number;
  currency: Currency;
}

export function GroupCard({ groupId, name, icon, color, balance, currency }: Props) {
  const settled = Math.abs(balance) < 0.005;
  const owed = balance > 0;
  const Icon = groupIconComponent(icon);

  return (
    <Link
      to={`/grupos/${groupId}`}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card active:scale-[0.99] transition-transform dark:bg-surface-dark-subtle"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className={`text-sm font-medium ${settled ? "text-neutral-400" : owed ? "text-positive" : "text-negative"}`}>
          {settled ? "Todo saldado" : owed ? `Te deben ${formatSignedCurrency(balance, currency).replace("+", "")}` : `Debes ${formatSignedCurrency(-balance, currency).replace("+", "")}`}
        </p>
      </div>
      <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
    </Link>
  );
}
