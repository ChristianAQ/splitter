import type { RecurringExpense } from "../types";

export interface RecurringBudgetSummary {
  /** Sum of every recurring expense shown in the "Recurrentes" tab. */
  totalRecurring: number;
  /** Sum of the ones checked off ("hecho") for `month`. */
  spent: number;
  /** Sum of the ones still unchecked for `month`. */
  pending: number;
  /** Available money minus what's already been checked off. */
  remainingNow: number;
  /** Available money minus every recurring expense — what's left once the whole month's fixed costs are covered. */
  projectedLeftover: number;
}

/** Sum of `recurring` items checked off ("hecho") for `month` — the same
 * figure the "Recurrentes" tab calls "Pagado", reused by Home's "Gastado
 * este mes" so a marked-done recurring expense counts there too. */
export function recurringSpentForMonth(recurring: RecurringExpense[], month: string): number {
  return recurring.reduce((sum, r) => sum + (r.lastCompletedMonth === month ? r.amount : 0), 0);
}

/** Count of `recurring` items not yet checked off for `month`. */
export function pendingRecurringCount(recurring: RecurringExpense[], month: string): number {
  return recurring.filter((r) => r.lastCompletedMonth !== month).length;
}

/**
 * Budget preview for the "Recurrentes" tab: given the recurring expenses
 * (whatever the tab lists, checked or not) and the money the user says they
 * have available this month, works out what's spent, what's left right now,
 * and what would be left over once every recurring expense for the month is
 * paid.
 */
export function summarizeRecurringBudget(
  recurring: RecurringExpense[],
  month: string,
  available: number
): RecurringBudgetSummary {
  const totalRecurring = recurring.reduce((sum, r) => sum + r.amount, 0);
  const spent = recurringSpentForMonth(recurring, month);

  return {
    totalRecurring,
    spent,
    pending: totalRecurring - spent,
    remainingNow: available - spent,
    projectedLeftover: available - totalRecurring,
  };
}
