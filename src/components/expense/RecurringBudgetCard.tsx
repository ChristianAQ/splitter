import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { summarizeRecurringBudget } from "../../domain/budget";
import { useAvailableMoney } from "../../hooks/useAvailableMoney";
import { formatCurrency, formatSignedCurrency } from "../../lib/format";
import type { Currency, RecurringExpense } from "../../types";

interface Props {
  recurring: RecurringExpense[];
  month: string; // "YYYY-MM"
  uid?: string;
  currency: Currency;
}

/** Calculator at the top of the "Recurrentes" tab: totals what's checked off
 * this month against money the user says they have available, so they can
 * see at a glance what's spent, what's left right now, and what would be
 * left over once every fixed expense for the month is paid. */
export function RecurringBudgetCard({ recurring, month, uid, currency }: Props) {
  const { raw, setAvailable } = useAvailableMoney(uid, month);
  const available = parseFloat(raw.replace(",", ".")) || 0;
  const summary = summarizeRecurringBudget(recurring, month, available);
  const hasAvailable = raw.trim() !== "";

  function handleChange(value: string) {
    const normalized = value.replace(",", ".");
    if (/^\d*\.?\d{0,2}$/.test(normalized)) setAvailable(normalized);
  }

  if (recurring.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <Input
        label="Dinero disponible este mes"
        inputMode="decimal"
        placeholder="Ej. 1200"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
      />

      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Total gastos recurrentes" value={formatCurrency(summary.totalRecurring, currency)} />
        <Row label="Llevas gastado (marcado)" value={formatCurrency(summary.spent, currency)} />
        <Row label="Pendiente de pagar" value={formatCurrency(summary.pending, currency)} />
      </dl>

      {hasAvailable && (
        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <Row
            label="Te queda ahora"
            value={formatSignedCurrency(summary.remainingNow, currency)}
            tone={summary.remainingNow >= 0 ? "positive" : "negative"}
            emphasize
          />
          <Row
            label="Te sobrará este mes"
            value={formatSignedCurrency(summary.projectedLeftover, currency)}
            tone={summary.projectedLeftover >= 0 ? "positive" : "negative"}
            emphasize
          />
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  emphasize?: boolean;
}) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className={`tabular-nums ${emphasize ? "text-base font-bold" : "font-semibold"} ${toneClass}`}>{value}</dd>
    </div>
  );
}
