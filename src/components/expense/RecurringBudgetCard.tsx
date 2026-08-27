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
 * this month against money the user says they have available, so the
 * headline number — what would be left over once every fixed expense for
 * the month is paid — reads at a glance, with the supporting breakdown
 * (pagado/pendiente/total) one level down. */
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

  const positive = summary.projectedLeftover >= 0;

  return (
    <Card className="flex flex-col gap-4">
      <Input
        label="Dinero disponible este mes"
        inputMode="decimal"
        placeholder="Ej. 1200"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
      />

      {hasAvailable ? (
        <div
          className={`rounded-xl2 p-4 ${
            positive ? "bg-positive-light dark:bg-positive/15" : "bg-negative-light dark:bg-negative/15"
          }`}
        >
          <p className={`text-xs font-semibold ${positive ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"}`}>
            Te sobrará este mes
          </p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
              positive ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"
            }`}
          >
            {formatSignedCurrency(summary.projectedLeftover, currency)}
          </p>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Ahora mismo te quedan{" "}
            <span className={summary.remainingNow >= 0 ? "font-semibold" : "font-semibold text-negative"}>
              {formatSignedCurrency(summary.remainingNow, currency)}
            </span>
          </p>
        </div>
      ) : (
        <div className="rounded-xl2 border-2 border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400 dark:border-neutral-700">
          Añade tu dinero disponible para ver cuánto te sobraría este mes
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Total" value={formatCurrency(summary.totalRecurring, currency)} />
        <StatTile label="Pagado" value={formatCurrency(summary.spent, currency)} />
        <StatTile label="Pendiente" value={formatCurrency(summary.pending, currency)} />
      </div>
    </Card>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 py-2.5 text-center dark:bg-neutral-800/60">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 truncate px-1 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
