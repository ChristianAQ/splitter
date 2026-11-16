import type { ISODate, PersonalExpense } from "../types";
import { daysBetween } from "./date";
import { fromMinorUnits, toMinorUnits } from "./money";

// An upcoming expense ("Próximo") can be paid in parts. Each part is an
// ordinary paid expense pointing back at it (`partOfId`); nothing about the
// upcoming expense itself changes until the last part, when it becomes a
// paid expense for whatever was left. So "how much is still to pay" is never
// stored — it's the total minus the parts that exist right now, which also
// means deleting a part by mistake simply gives that amount back.

/** Paid parts grouped by the upcoming expense they belong to, oldest first. */
export function partsByParent(expenses: PersonalExpense[]): Map<string, PersonalExpense[]> {
  const map = new Map<string, PersonalExpense[]>();
  for (const e of expenses) {
    if (!e.partOfId || e.status === "future") continue;
    const list = map.get(e.partOfId);
    if (list) list.push(e);
    else map.set(e.partOfId, [e]);
  }
  for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  return map;
}

export interface PaymentProgress {
  total: number;
  paid: number;
  remaining: number;
  parts: PersonalExpense[];
}

/** Where an upcoming expense stands: its total, what's been paid, what's left. */
export function progressOf(expense: PersonalExpense, parts: Map<string, PersonalExpense[]>): PaymentProgress {
  const own = parts.get(expense.id) ?? [];
  const totalMinor = toMinorUnits(expense.amount, expense.currency);
  const paidMinor = Math.min(
    own.reduce((sum, p) => sum + toMinorUnits(p.amount, expense.currency), 0),
    totalMinor
  );
  return {
    total: expense.amount,
    paid: fromMinorUnits(paidMinor, expense.currency),
    remaining: fromMinorUnits(totalMinor - paidMinor, expense.currency),
    parts: own,
  };
}

export type DueBucket = "overdue" | "soon" | "later" | "undated";

/** "soon" is today through the next seven days. */
export function dueBucket(expense: PersonalExpense, today: ISODate): DueBucket {
  if (expense.undated) return "undated";
  const days = daysBetween(today, expense.date);
  if (days < 0) return "overdue";
  return days <= 7 ? "soon" : "later";
}

/** How far off the due date is, in plain words; null for undated ones and
 * for dates far enough away that the date itself says it better. */
export function dueText(expense: PersonalExpense, today: ISODate): string | null {
  if (expense.undated) return null;
  const days = daysBetween(today, expense.date);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Venció ayer";
  if (days < 0) return `Venció hace ${-days} días`;
  if (days <= 30) return `En ${days} días`;
  return null;
}

const BUCKET_ORDER: DueBucket[] = ["overdue", "soon", "later", "undated"];

/** Upcoming expenses in the order they need attention: overdue, due this
 * week, later, and finally the ones with no deadline. */
export function groupUpcoming(upcoming: PersonalExpense[], today: ISODate): { bucket: DueBucket; items: PersonalExpense[] }[] {
  const groups = new Map<DueBucket, PersonalExpense[]>();
  for (const e of upcoming) {
    const bucket = dueBucket(e, today);
    const list = groups.get(bucket);
    if (list) list.push(e);
    else groups.set(bucket, [e]);
  }
  for (const [bucket, list] of groups) {
    list.sort((a, b) =>
      bucket === "undated" ? b.createdAt - a.createdAt : a.date.localeCompare(b.date) || a.createdAt - b.createdAt
    );
  }
  return BUCKET_ORDER.filter((b) => groups.has(b)).map((bucket) => ({ bucket, items: groups.get(bucket)! }));
}
