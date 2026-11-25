import { useMemo } from "react";
import { Link } from "react-router-dom";
import { monthsUntil, summarizeCommitments } from "../../domain/commitments";
import { formatCurrency, formatMonth } from "../../lib/format";
import type { Currency, RecurringExpense } from "../../types";

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });

function lastPaymentLabel(date: string, today: string) {
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1);
  const month = MONTH_SHORT.format(d).replace(".", "");
  return date.slice(0, 4) === today.slice(0, 4) ? month : `${month} ${date.slice(2, 4)}`;
}

function whenLabel(months: number) {
  if (months <= 0) return "este mes";
  if (months === 1) return "el mes que viene";
  return `en ${months} meses`;
}

/** Payments left as a ring around the count — "2" inside a ring two
 * thirds full reads as "two to go, nearly done" at a glance. */
function PaymentsRing({ paid, total }: { paid: number; total: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? paid / total : 0;
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className="stroke-accent/15 dark:stroke-accent/25" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
        />
      </svg>
      <span className="text-[13px] font-semibold tabular-nums">{total - paid}</span>
    </span>
  );
}

interface Props {
  recurring: RecurringExpense[];
  currency: Currency;
  today: string;
  /** How many plans to list; the rest are summed up in the header. */
  limit?: number;
}

/**
 * Inicio's short version of "what's left on the fixed expenses": only the
 * ones that end, the closest to finishing first, each with the payments
 * left in a ring. The month-by-month chart and the rest of the detail live
 * in Estadísticas.
 */
export function EndingSoonCard({ recurring, currency, today, limit = 3 }: Props) {
  const summary = useMemo(() => summarizeCommitments(recurring, currency, today), [recurring, currency, today]);
  if (summary.finite.length === 0) return null;
  const money = (v: number) => formatCurrency(v, currency);
  const until = summary.lastMonth ? monthsUntil(today.slice(0, 7), summary.lastMonth) : 0;

  return (
    <div className="surface rounded-[22px]">
      <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-3.5">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{money(summary.remainingTotal)}</span> por pagar en plazos
        </p>
        {summary.lastMonth && (
          <p className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
            Libre <span className="font-semibold text-accent-700 dark:text-accent-300">{whenLabel(until)}</span>
          </p>
        )}
      </div>
      <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {summary.finite.slice(0, limit).map((c) => (
          <li key={c.id}>
            <Link to="/gastos?tab=recurrentes" className="well-press flex items-center gap-3 px-4 py-3 last:rounded-b-[22px]">
              <PaymentsRing paid={c.paidPayments} total={c.totalPayments} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{c.description}</span>
                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {c.remainingPayments === 1 ? "Último pago" : `${c.remainingPayments} pagos`}
                  {c.lastPaymentDate && ` · hasta ${lastPaymentLabel(c.lastPaymentDate, today)}`}
                </span>
              </span>
              <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums">{money(c.remainingAmount)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {summary.finite.length > limit && (
        <p className="px-4 pb-3 text-xs text-neutral-500 dark:text-neutral-400">
          y {summary.finite.length - limit} más hasta {summary.lastMonth && formatMonth(`${summary.lastMonth}-01`)}
        </p>
      )}
    </div>
  );
}
