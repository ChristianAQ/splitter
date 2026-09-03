import { splitEqual } from "../../domain/split";
import { formatCurrency } from "../../lib/format";
import { Avatar } from "../ui/Avatar";
import type { Currency, GroupMember, SplitMethod } from "../../types";

interface Props {
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  totalAmount: number;
  currency: Currency;
  participants: GroupMember[];
  amounts: Record<string, string>;
  onAmountChange: (uid: string, raw: string) => void;
}

export function SplitSelector({
  method,
  onMethodChange,
  totalAmount,
  currency,
  participants,
  amounts,
  onAmountChange,
}: Props) {
  const sum = participants.reduce((s, p) => s + (parseFloat(amounts[p.uid]) || 0), 0);
  const diff = Math.round((totalAmount - sum) * 100) / 100;
  const equalPreview =
    method === "equal" && totalAmount > 0
      ? splitEqual(totalAmount, currency, participants.map((p) => p.uid))
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onMethodChange("equal")}
          className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
            method === "equal"
              ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
              : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
          }`}
        >
          Partes iguales
        </button>
        <button
          type="button"
          onClick={() => onMethodChange("amount")}
          className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
            method === "amount"
              ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
              : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
          }`}
        >
          Por importe
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {participants.map((p) => {
          const share = equalPreview?.splits.find((s) => s.uid === p.uid)?.amount;
          return (
            <li key={p.uid} className="flex items-center gap-3 py-2.5">
              <Avatar name={p.name} color={p.color} photoUrl={p.photoUrl} size="sm" />
              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
              {method === "equal" ? (
                <span className="text-sm font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                  {share !== undefined ? formatCurrency(share, currency) : "—"}
                </span>
              ) : (
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amounts[p.uid] ?? ""}
                  onChange={(e) => onAmountChange(p.uid, e.target.value)}
                  className="w-24 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-900"
                />
              )}
            </li>
          );
        })}
      </ul>

      {method === "amount" && totalAmount > 0 && (
        <p className={`text-sm font-medium ${Math.abs(diff) < 0.005 ? "text-positive" : "text-negative"}`}>
          {Math.abs(diff) < 0.005
            ? "Los importes cuadran ✓"
            : diff > 0
              ? `Faltan ${formatCurrency(diff, currency)} por asignar`
              : `Sobran ${formatCurrency(Math.abs(diff), currency)}`}
        </p>
      )}
    </div>
  );
}
