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
  let totalRecurring = 0;
  let spent = 0;

  for (const r of recurring) {
    totalRecurring += r.amount;
    if (r.lastCompletedMonth === month) spent += r.amount;
  }

  return {
    totalRecurring,
    spent,
    pending: totalRecurring - spent,
    remainingNow: available - spent,
    projectedLeftover: available - totalRecurring,
  };
}
