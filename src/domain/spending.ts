import type { PersonalExpense } from "../types";
import { daysInMonth } from "./date";

/** What was spent in one month, and where it came from. */
export interface MonthSpending {
  /** Day-to-day expenses, including parts paid towards upcoming ones. */
  variable: number;
  /** Fixed expenses ticked off as paid. */
  fixed: number;
  /** The user's own share of their groups' expenses. */
  groups: number;
  total: number;
  /** How many personal expenses (variable + fixed) that was. */
  count: number;
}

export interface SpendingSummary {
  months: string[];
  byMonth: Record<string, MonthSpending>;
  /** month -> category id -> amount. The groups' share sits under its own id. */
  categories: Record<string, Record<string, number>>;
}

const cents = (n: number) => Math.round(n * 100);

/**
 * The one definition of "spent" the app uses everywhere (Inicio and
 * Estadísticas used to disagree): every paid personal expense — fixed ones
 * included, since ticking them off records an expense — plus the user's
 * share of what their groups spent. Upcoming expenses don't count until
 * they're paid.
 */
export function summarizeSpending(
  expenses: PersonalExpense[],
  groupShareByMonth: Record<string, number>,
  months: string[],
  groupsCategoryId: string
): SpendingSummary {
  const acc: Record<string, { variable: number; fixed: number; groups: number; count: number }> = {};
  const cats: Record<string, Record<string, number>> = {};
  for (const m of months) {
    acc[m] = { variable: 0, fixed: 0, groups: 0, count: 0 };
    cats[m] = {};
  }

  for (const e of expenses) {
    if (e.status === "future") continue;
    const month = e.date.slice(0, 7);
    const bucket = acc[month];
    if (!bucket) continue;
    const amount = cents(e.amount);
    if (e.recurringSourceId) bucket.fixed += amount;
    else bucket.variable += amount;
    bucket.count += 1;
    cats[month][e.categoryId] = (cats[month][e.categoryId] ?? 0) + amount;
  }

  for (const m of months) {
    const share = cents(groupShareByMonth[m] ?? 0);
    if (share > 0) {
      acc[m].groups = share;
      cats[m][groupsCategoryId] = share;
    }
  }

  const byMonth: Record<string, MonthSpending> = {};
  const categories: Record<string, Record<string, number>> = {};
  for (const m of months) {
    const a = acc[m];
    byMonth[m] = {
      variable: a.variable / 100,
      fixed: a.fixed / 100,
      groups: a.groups / 100,
      total: (a.variable + a.fixed + a.groups) / 100,
      count: a.count,
    };
    categories[m] = Object.fromEntries(Object.entries(cats[m]).map(([id, v]) => [id, v / 100]));
  }
  return { months, byMonth, categories };
}

/** Average monthly total over the months that have any spending at all —
 * empty months before the user started (or during a break) would drag a
 * plain mean toward zero. */
export function averageMonthlySpend(summary: SpendingSummary): number {
  const totals = summary.months.map((m) => summary.byMonth[m].total).filter((t) => t > 0);
  return totals.length === 0 ? 0 : cents(totals.reduce((a, b) => a + b, 0) / totals.length) / 100;
}

/** Percentage change from `previous` to `current`; null when there's nothing to compare against. */
export function changePercent(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

/** Spend per day so far in `month`: over the days elapsed if it's the
 * current month, over all its days if it's a past one. */
export function dailyAverage(total: number, month: string, today: string): number {
  const [y, m] = month.split("-").map(Number);
  const days = month === today.slice(0, 7) ? Number(today.slice(8)) : daysInMonth(y, m - 1);
  return cents(total / days) / 100;
}

/**
 * Where the current month would end at the pace so far: the fixed costs
 * already paid stay as they are (they don't recur within the month), the
 * rest is extrapolated from the days elapsed.
 */
export function projectedMonthEnd(spending: MonthSpending, today: string): number {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  const elapsed = Number(today.slice(8));
  const paced = ((spending.variable + spending.groups) / elapsed) * daysInMonth(y, m - 1);
  return cents(spending.fixed + paced) / 100;
}
