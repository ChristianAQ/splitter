import type { Currency, ISODate, RecurringExpense, RecurringPeriodicity } from "../types";
import { daysInMonth, shiftMonth } from "./date";
import { occurrencesInRange } from "./recurring";

/**
 * How much of a fixed expense is still to be paid, and until when.
 *
 * A fixed expense with no end date (rent, a subscription) never finishes:
 * it has no "left to pay", only a monthly cost. One with an end date — a
 * purchase paid in 3 instalments, a loan — has a known number of payments,
 * and this counts the ones still ahead.
 *
 * "Still ahead" is month-based, like ticking fixed expenses off: every
 * payment from the current month on is pending, except this month's once
 * it's been marked as paid. Earlier months are taken as paid — the app has
 * no record of them either way.
 */
export interface FixedCommitment {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  periodicity: RecurringPeriodicity;
  /** null: it doesn't end. */
  endDate: ISODate | null;
  /** What it costs in an average month (a yearly one, a twelfth). */
  monthlyEquivalent: number;
  /** Only for the ones with an end date: */
  totalPayments: number;
  paidPayments: number;
  remainingPayments: number;
  remainingAmount: number;
  /** Date of the last payment still to make, or of the last one if none is left. */
  lastPaymentDate: ISODate | null;
}

export interface CommitmentsSummary {
  /** With an end date and something still to pay, the soonest to finish first. */
  finite: FixedCommitment[];
  /** No end date, the most expensive first. */
  indefinite: FixedCommitment[];
  /** Everything still to pay on the ones that end. */
  remainingTotal: number;
  /** Payments still to make on the ones that end. */
  remainingPayments: number;
  /** Month ("YYYY-MM") of the last payment on the ones that end — from the
   * following month on, only the indefinite ones are left. */
  lastMonth: string | null;
  /** Average monthly cost of the indefinite ones — the part that stays. */
  indefiniteMonthly: number;
}

const cents = (n: number) => Math.round(n * 100);

function monthBounds(month: string): [ISODate, ISODate] {
  const [y, m] = month.split("-").map(Number);
  return [`${month}-01`, `${month}-${String(daysInMonth(y, m - 1)).padStart(2, "0")}`];
}

function monthlyEquivalent(r: RecurringExpense): number {
  if (r.periodicity === "weekly") return cents((r.amount * 52) / 12) / 100;
  if (r.periodicity === "yearly") return cents(r.amount / 12) / 100;
  return r.amount;
}

export function commitmentOf(r: RecurringExpense, today: ISODate): FixedCommitment {
  const base = {
    id: r.id,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    periodicity: r.periodicity,
    monthlyEquivalent: monthlyEquivalent(r),
  };
  if (!r.endDate) {
    return { ...base, endDate: null, totalPayments: 0, paidPayments: 0, remainingPayments: 0, remainingAmount: 0, lastPaymentDate: null };
  }

  const thisMonth = today.slice(0, 7);
  const [monthStart] = monthBounds(thisMonth);
  const all = occurrencesInRange({ ...r, active: true }, r.startDate, r.endDate);
  // This month's are pending until it's ticked off; then they're paid.
  const doneThisMonth = r.lastCompletedMonth === thisMonth;
  const pendingFrom = doneThisMonth ? shiftMonth(thisMonth, 1) + "-01" : monthStart;
  const remaining = r.active ? all.filter((d) => d >= pendingFrom) : [];

  return {
    ...base,
    endDate: r.endDate,
    totalPayments: all.length,
    paidPayments: all.length - remaining.length,
    remainingPayments: remaining.length,
    remainingAmount: cents(remaining.length * r.amount) / 100,
    lastPaymentDate: remaining[remaining.length - 1] ?? all[all.length - 1] ?? null,
  };
}

/** Every active fixed expense in `currency`, split into the ones that end
 * (with something still to pay) and the ones that don't. */
export function summarizeCommitments(recurring: RecurringExpense[], currency: Currency, today: ISODate): CommitmentsSummary {
  const finite: FixedCommitment[] = [];
  const indefinite: FixedCommitment[] = [];
  for (const r of recurring) {
    if (!r.active || r.currency !== currency) continue;
    const c = commitmentOf(r, today);
    if (c.endDate === null) indefinite.push(c);
    else if (c.remainingPayments > 0) finite.push(c);
  }
  finite.sort((a, b) => (a.lastPaymentDate ?? "").localeCompare(b.lastPaymentDate ?? "") || a.description.localeCompare(b.description));
  indefinite.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent || a.description.localeCompare(b.description));

  const lastDate = finite.reduce<ISODate | null>((max, c) => (c.lastPaymentDate && (!max || c.lastPaymentDate > max) ? c.lastPaymentDate : max), null);
  return {
    finite,
    indefinite,
    remainingTotal: finite.reduce((sum, c) => sum + cents(c.remainingAmount), 0) / 100,
    remainingPayments: finite.reduce((sum, c) => sum + c.remainingPayments, 0),
    lastMonth: lastDate ? lastDate.slice(0, 7) : null,
    indefiniteMonthly: indefinite.reduce((sum, c) => sum + cents(c.monthlyEquivalent), 0) / 100,
  };
}

/** One month of the fixed-cost outlook. */
export interface OutlookMonth {
  month: string;
  /** What the fixed expenses with no end date charge that month. */
  indefinite: number;
  /** What the ones with an end date charge that month. */
  finite: number;
  total: number;
  /** Descriptions of the ones that make their last payment that month. */
  ending: string[];
}

/**
 * What the fixed expenses will charge in each of the next `count` months,
 * starting with the current one (in full, ticked off or not): the part
 * that stays, and the part that runs out — so the months where a payment
 * plan finishes show as a step down.
 */
export function fixedOutlook(recurring: RecurringExpense[], currency: Currency, today: ISODate, count = 12): OutlookMonth[] {
  const thisMonth = today.slice(0, 7);
  const active = recurring.filter((r) => r.active && r.currency === currency);
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(thisMonth, i);
    const [start, end] = monthBounds(month);
    let indefinite = 0;
    let finite = 0;
    const ending: string[] = [];
    for (const r of active) {
      const n = occurrencesInRange(r, start, end).length;
      if (n === 0) continue;
      const amount = cents(n * r.amount);
      if (r.endDate) {
        finite += amount;
        // No occurrence after this month: this is where it finishes.
        if (occurrencesInRange(r, shiftMonth(month, 1) + "-01", r.endDate).length === 0) ending.push(r.description);
      } else {
        indefinite += amount;
      }
    }
    return { month, indefinite: indefinite / 100, finite: finite / 100, total: (indefinite + finite) / 100, ending };
  });
}

/** Whole months from `from` to `to` ("YYYY-MM"); 0 for the same month. */
export function monthsUntil(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}
