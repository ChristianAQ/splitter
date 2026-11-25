import { CalendarClock, Check } from "lucide-react";
import { dueInMonth, summarizeRecurringBudget } from "../../domain/budget";
import { chargeDateInMonth } from "../../domain/recurring";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Currency, RecurringExpense } from "../../types";

const MONTH_LONG = new Intl.DateTimeFormat("es-ES", { month: "long" });

interface Props {
  recurring: RecurringExpense[];
  month: string;
  today: string;
  currency: Currency;
}

/**
 * The head of Fijos, laid out like a bank app's "scheduled payments": what
 * the fixed expenses add up to a month, how much of it has gone out, and
 * the next charge coming.
 */
export function FixedOverviewCard({ recurring, month, today, currency }: Props) {
  const summary = summarizeRecurringBudget(recurring, month, 0);
  const money = (v: number) => formatCurrency(v, currency);
  const due = dueInMonth(recurring, month);
  const paidCount = due.filter((r) => r.lastCompletedMonth === month).length;
  const share = summary.totalRecurring > 0 ? Math.min(summary.spent / summary.totalRecurring, 1) : 0;
  const allPaid = due.length > 0 && paidCount === due.length;

  // The next one still to go out: this month's unpaid charges from today on.
  const next = recurring
    .filter((r) => r.active && r.lastCompletedMonth !== month)
    .map((r) => ({ r, date: chargeDateInMonth(r, month) }))
    .filter((x): x is { r: RecurringExpense; date: string } => x.date !== null && x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const monthName = MONTH_LONG.format(new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1));
  const [whole, cents] = money(summary.totalRecurring).split(",");

  return (
    <section className="hero-card rounded-[28px] p-5">
      <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">Gastos fijos de este mes</p>
      <p className="mt-1 text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
        {whole}
        {cents && <span className="text-[24px] tracking-[-0.02em] text-neutral-500 dark:text-neutral-400">,{cents}</span>}
      </p>

      {/* Paid vs. still to go out this month. */}
      <div className="mt-5 flex items-baseline justify-between text-xs">
        <span className="font-semibold capitalize text-neutral-700 dark:text-neutral-200">{monthName}</span>
        <span className="text-neutral-500 dark:text-neutral-400">
          {paidCount} de {due.length} pagados
        </span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10"
        role="meter"
        aria-label={`Pagado en ${monthName}`}
        aria-valuemin={0}
        aria-valuemax={summary.totalRecurring}
        aria-valuenow={summary.spent}
        aria-valuetext={`${money(summary.spent)} de ${money(summary.totalRecurring)}`}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${share * 100}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            Pagado
          </dt>
          <dd className="mt-0.5 text-[17px] font-semibold tabular-nums">{money(summary.spent)}</dd>
        </div>
        <div className="text-right">
          <dt className="flex items-center justify-end gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-black/15 dark:bg-white/25" aria-hidden />
            Pendiente
          </dt>
          <dd className="mt-0.5 text-[17px] font-semibold tabular-nums">{money(summary.pending)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-white/55 px-3.5 py-3 dark:bg-white/[0.06]">
        {allPaid ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive dark:bg-positive/20 dark:text-positive-dark">
              <Check size={17} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium">Todo pagado este mes</span>
          </>
        ) : next ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/25 dark:text-accent-300">
              <CalendarClock size={17} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Próximo cargo · {next.date === today ? "hoy" : formatDate(next.date)}</span>
              <span className="block truncate text-sm font-semibold">{next.r.description}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(next.r.amount, next.r.currency)}</span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              <CalendarClock size={17} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{money(summary.pending)}</span> sin marcar de días ya pasados
            </span>
          </>
        )}
      </div>
    </section>
  );
}
