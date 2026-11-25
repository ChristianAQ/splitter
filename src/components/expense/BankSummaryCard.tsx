import { Check, Landmark, Settings2 } from "lucide-react";
import { NO_BANK_COLOR } from "../../lib/banks";
import { formatCurrency } from "../../lib/format";
import type { BankTotal } from "../../domain/banks";
import type { Bank, Currency } from "../../types";

interface Props {
  banks: Bank[];
  totals: BankTotal[];
  currency: Currency;
  /** undefined = showing every bank; null = the "no bank" group. */
  selected: string | null | undefined;
  onSelect: (bankId: string | null | undefined) => void;
  onManage: () => void;
}

/**
 * Fixed expenses totalled by the bank they're paid from: one bar split in
 * each bank's color, then a row per bank with its monthly total and what
 * hasn't gone out yet this month. Tapping a row filters the list below to
 * that bank; tapping it again shows everything.
 */
export function BankSummaryCard({ banks, totals, currency, selected, onSelect, onManage }: Props) {
  const grand = totals.reduce((sum, t) => sum + t.total, 0);
  const assigned = totals.some((t) => t.bankId !== null);

  if (!assigned) {
    return (
      <button type="button" onClick={onManage} className="surface pressable flex w-full items-center gap-3 rounded-[22px] p-4 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
          <Landmark size={18} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{banks.length === 0 ? "Añade tus bancos" : "Asigna un banco a cada gasto"}</span>
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
            {banks.length === 0
              ? "Ponle a cada uno su color y verás cuánto sale de cada cuenta."
              : "Abre un gasto fijo, pulsa Editar y elige de qué banco sale."}
          </span>
        </span>
      </button>
    );
  }

  const meta = (bankId: string | null) => {
    const bank = bankId ? banks.find((b) => b.id === bankId) : undefined;
    return { name: bank?.name ?? "Sin banco", color: bank?.color ?? NO_BANK_COLOR };
  };

  return (
    <div className="surface rounded-[22px] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Por banco</h3>
        <button
          type="button"
          onClick={onManage}
          className="pressable -mr-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-accent dark:text-accent-300"
        >
          <Settings2 size={13} strokeWidth={2.2} />
          Editar bancos
        </button>
      </div>

      <div className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full" aria-hidden>
        {totals.map((t) => (
          <div
            key={t.bankId ?? "none"}
            className={`h-full rounded-full transition-opacity duration-200 ${selected !== undefined && selected !== t.bankId ? "opacity-25" : ""}`}
            style={{ width: `${grand > 0 ? Math.max((t.total / grand) * 100, 2) : 0}%`, backgroundColor: meta(t.bankId).color }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-col">
        {totals.map((t) => {
          const { name, color } = meta(t.bankId);
          const active = selected === t.bankId;
          return (
            <button
              key={t.bankId ?? "none"}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? undefined : t.bankId)}
              className={`pressable -mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors ${active ? "well" : ""}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{name}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {t.count} gasto{t.count === 1 ? "" : "s"}
                  {grand > 0 && ` · ${Math.round((t.total / grand) * 100)}%`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-semibold tabular-nums">{formatCurrency(t.total, currency)}</span>
                {t.pending > 0 ? (
                  <span className="block text-xs tabular-nums text-neutral-500 dark:text-neutral-400">quedan {formatCurrency(t.pending, currency)}</span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-positive dark:text-positive-dark">
                    <Check size={12} strokeWidth={3} />
                    al día
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
