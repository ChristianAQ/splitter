import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Infinity as InfinityIcon } from "lucide-react";
import { StackedColumns } from "../charts/StackedColumns";
import { fixedOutlook, monthsUntil, summarizeCommitments } from "../../domain/commitments";
import { formatCurrency, formatDate, formatMonth } from "../../lib/format";
import type { Currency, RecurringExpense } from "../../types";

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });
const monthDate = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);
const shortLabel = (month: string) => MONTH_SHORT.format(monthDate(month)).replace(".", "").slice(0, 3);

function whenLabel(months: number) {
  if (months <= 0) return "este mes";
  if (months === 1) return "el mes que viene";
  if (months < 12) return `dentro de ${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `dentro de ${years} año${years === 1 ? "" : "s"}${rest ? ` y ${rest} mes${rest === 1 ? "" : "es"}` : ""}`;
}

interface Props {
  recurring: RecurringExpense[];
  currency: Currency;
  today: string;
  /** How many months the outlook chart covers, starting with this one. */
  months?: number;
  /** Without its own card, for placing inside another panel. */
  bare?: boolean;
}

/**
 * How long the fixed expenses keep costing what they cost: the ones with an
 * end date (a purchase in instalments, a loan) with what's left on each and
 * when the last payment is; the ones without (rent, subscriptions), which
 * simply carry on; and a chart of the coming months where each plan that
 * finishes shows as a step down.
 */
export function FixedCommitmentsCard({ recurring, currency, today, months = 12, bare }: Props) {
  const thisMonth = today.slice(0, 7);
  const summary = useMemo(() => summarizeCommitments(recurring, currency, today), [recurring, currency, today]);
  const outlook = useMemo(() => fixedOutlook(recurring, currency, today, months), [recurring, currency, today, months]);
  const money = (v: number) => formatCurrency(v, currency);

  if (summary.finite.length === 0 && summary.indefinite.length === 0) return null;
  const hasFinite = summary.finite.length > 0;
  const until = summary.lastMonth ? monthsUntil(thisMonth, summary.lastMonth) : null;

  return (
    <div className={`flex flex-col gap-4 ${bare ? "" : "surface rounded-[22px] p-4"}`}>
      {/* ---------------------------------------------- The headline */}
      {hasFinite ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Te queda por pagar</p>
            <p className="mt-0.5 truncate text-[26px] font-semibold leading-tight tracking-[-0.03em]">{money(summary.remainingTotal)}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {summary.remainingPayments} pago{summary.remainingPayments === 1 ? "" : "s"} en {summary.finite.length} gasto
              {summary.finite.length === 1 ? "" : "s"} con fin
            </p>
          </div>
          <div className="well min-w-0 rounded-[16px] px-3 py-2.5">
            <p className="flex items-center gap-1 text-[12px] text-neutral-500 dark:text-neutral-400">
              <CalendarCheck size={13} strokeWidth={2} aria-hidden />
              Último pago
            </p>
            <p className="mt-0.5 truncate text-[16px] font-semibold first-letter:uppercase">{summary.lastMonth && formatMonth(`${summary.lastMonth}-01`)}</p>
            <p className="truncate text-xs font-medium text-accent-700 dark:text-accent-300">{until !== null && whenLabel(until)}</p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Ninguno de tus gastos fijos tiene fecha de fin</p>
          <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em]">
            {money(summary.indefiniteMonthly)}
            <span className="ml-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">al mes, sin fin</span>
          </p>
        </div>
      )}

      {/* ---------------------------------------------- The coming months */}
      <div className="pt-2">
        <p className="mb-2 text-[13px] font-semibold">Cuota fija de los próximos {months} meses</p>
        <StackedColumns
          caption={`Gastos fijos de los próximos ${months} meses`}
          height={96}
          formatValue={money}
          markerLabel={hasFinite ? "Termina un plazo" : undefined}
          series={[
            { key: "indefinite", label: "Sin fecha de fin", color: "var(--series-muted)" },
            { key: "finite", label: "Con fecha de fin", color: "rgb(var(--accent-500))" },
          ]}
          columns={outlook.map((m) => ({
            key: m.month,
            label: shortLabel(m.month),
            name: formatMonth(`${m.month}-01`),
            values: { indefinite: m.indefinite, finite: m.finite },
            marked: m.ending.length > 0,
            note: m.ending.length > 0 ? `Último pago: ${m.ending.join(", ")}` : undefined,
          }))}
        />
      </div>

      {/* ---------------------------------------------- One by one */}
      {hasFinite && (
        <ul className="flex flex-col gap-1">
          {summary.finite.map((c) => {
            const progress = c.totalPayments > 0 ? c.paidPayments / c.totalPayments : 0;
            return (
              <li key={c.id}>
                <Link to="/gastos?tab=recurrentes" className="well-press -mx-2 block rounded-2xl px-2 py-2">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.description}</span>
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">quedan</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{money(c.remainingAmount)}</span>
                  </span>
                  <span
                    className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-accent/15 dark:bg-accent/25"
                    role="meter"
                    aria-label={`${c.description}: pagos hechos`}
                    aria-valuemin={0}
                    aria-valuemax={c.totalPayments}
                    aria-valuenow={c.paidPayments}
                    aria-valuetext={`${c.paidPayments} de ${c.totalPayments} pagos`}
                  >
                    <span className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.max(progress * 100, 2)}%` }} />
                  </span>
                  <span className="mt-1 flex justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>
                      {c.paidPayments} de {c.totalPayments} pagos · {money(c.amount)} cada uno
                    </span>
                    <span className="shrink-0">{c.lastPaymentDate && `hasta el ${formatDate(c.lastPaymentDate)}${c.lastPaymentDate.slice(0, 4) !== today.slice(0, 4) ? ` ${c.lastPaymentDate.slice(0, 4)}` : ""}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------------------------------------------- What carries on */}
      {summary.indefinite.length > 0 && (
        <Link to="/gastos?tab=recurrentes" className="well well-press flex items-center gap-3 rounded-[16px] px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
            <InfinityIcon size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Sin fecha de fin</span>
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{summary.indefinite.map((c) => c.description).join(", ")}</span>
          </span>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
            {money(summary.indefiniteMonthly)}
            <span className="block text-[11px] font-normal text-neutral-500 dark:text-neutral-400">al mes</span>
          </span>
        </Link>
      )}
    </div>
  );
}
