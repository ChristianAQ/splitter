import type { RecurringExpense } from "../types";
import { addDays, addMonthsClamped, compareISO, formatISO, parseISO } from "./date";

/**
 * Returns every occurrence date of `recurring` that falls within
 * [rangeStart, rangeEnd] (inclusive), respecting startDate/endDate/active.
 *
 * Pure and deterministic — safe to call repeatedly for a preview ("próximos
 * gastos") without side effects. Turning an occurrence into a persisted
 * PersonalExpense (and guaranteeing it's created at most once) is the job of
 * the service layer, which checks Firestore for an existing document with
 * the same (recurringSourceId, date) before writing.
 */
export function occurrencesInRange(
  recurring: RecurringExpense,
  rangeStart: string,
  rangeEnd: string
): string[] {
  if (!recurring.active) return [];

  const effectiveEnd =
    recurring.endDate && compareISO(recurring.endDate, rangeEnd) < 0
      ? recurring.endDate
      : rangeEnd;

  if (compareISO(effectiveEnd, rangeStart) < 0) return [];
  if (compareISO(recurring.startDate, effectiveEnd) > 0) return [];

  const dates: string[] = [];

  if (recurring.periodicity === "weekly") {
    let cursor = parseISO(recurring.startDate);
    let iso = formatISO(cursor);
    // Fast-forward to the first occurrence >= rangeStart without an
    // unbounded loop for old recurring expenses.
    if (compareISO(iso, rangeStart) < 0) {
      const start = parseISO(rangeStart);
      const diffDays = Math.floor((start.getTime() - cursor.getTime()) / 86_400_000);
      const weeksToSkip = Math.max(0, Math.floor(diffDays / 7));
      cursor = addDays(cursor, weeksToSkip * 7);
    }
    iso = formatISO(cursor);
    while (compareISO(iso, effectiveEnd) <= 0) {
      if (compareISO(iso, rangeStart) >= 0) dates.push(iso);
      cursor = addDays(cursor, 7);
      iso = formatISO(cursor);
    }
    return dates;
  }

  if (recurring.periodicity === "monthly") {
    const start = parseISO(recurring.startDate);
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    let iso = formatISO(addMonthsClamped(cursor, 0, recurring.dayOfMonth));
    let guard = 0;
    while (compareISO(iso, effectiveEnd) <= 0 && guard < 2400) {
      guard += 1;
      if (compareISO(iso, rangeStart) >= 0 && compareISO(iso, recurring.startDate) >= 0) {
        dates.push(iso);
      }
      cursor = addMonthsClamped(cursor, 1, 1);
      iso = formatISO(addMonthsClamped(cursor, 0, recurring.dayOfMonth));
    }
    return dates;
  }

  // yearly
  const start = parseISO(recurring.startDate);
  let year = start.getUTCFullYear();
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    const occurrence = new Date(Date.UTC(year, start.getUTCMonth(), start.getUTCDate()));
    const iso = formatISO(occurrence);
    if (compareISO(iso, effectiveEnd) > 0) break;
    if (compareISO(iso, rangeStart) >= 0 && compareISO(iso, recurring.startDate) >= 0) {
      dates.push(iso);
    }
    year += 1;
  }
  return dates;
}

/** Next single occurrence on/after `fromDate`, or null if none (inactive/ended). */
export function nextOccurrence(recurring: RecurringExpense, fromDate: string): string | null {
  const horizon = addDays(parseISO(fromDate), 366 * 2);
  const found = occurrencesInRange(recurring, fromDate, formatISO(horizon));
  return found[0] ?? null;
}
