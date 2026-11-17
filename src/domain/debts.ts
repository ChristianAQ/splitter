import type { Debt, DebtPayment, ISODate } from "../types";
import { daysBetween } from "./date";
import { fromMinorUnits, toMinorUnits } from "./money";

/** Reminders due within this many days are flagged as "soon". */
export const DUE_SOON_DAYS = 7;

export function isSettled(debt: Debt): boolean {
  return debt.settledAt !== undefined;
}

/** What's still outstanding — never negative, zero once settled. */
export function remainingAmount(debt: Debt): number {
  if (isSettled(debt)) return 0;
  const minor = toMinorUnits(debt.amount, debt.currency) - toMinorUnits(debt.paidAmount, debt.currency);
  return fromMinorUnits(Math.max(minor, 0), debt.currency);
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later";

export function dueState(debt: Debt, today: ISODate): DueState {
  if (isSettled(debt) || !debt.dueDate) return "none";
  const days = daysBetween(today, debt.dueDate);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return days <= DUE_SOON_DAYS ? "soon" : "later";
}

/** Short Spanish label for the due date relative to `today`, or null when
 * there's no deadline ("cuando pueda"). */
export function dueLabel(debt: Debt, today: ISODate): string | null {
  if (!debt.dueDate) return null;
  const days = daysBetween(today, debt.dueDate);
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  if (days === -1) return "Venció ayer";
  if (days < 0) return `Venció hace ${-days} días`;
  if (days <= 30) return `Vence en ${days} días`;
  return null; // far enough away that the caller shows the plain date instead
}

export interface DebtSummary {
  /** Outstanding money I have to hand over: borrowed + pending reminders. */
  iOwe: number;
  /** Outstanding money I'm waiting to get back. */
  owedToMe: number;
  openCount: number;
  overdueCount: number;
}

/** Totals over open debts in `currency` only — there's no exchange-rate
 * conversion anywhere in the app, so other currencies are left out rather
 * than added up as if they were the same unit. */
export function summarizeDebts(debts: Debt[], currency: string, today: ISODate): DebtSummary {
  let iOweMinor = 0;
  let owedMinor = 0;
  let openCount = 0;
  let overdueCount = 0;

  for (const debt of debts) {
    if (isSettled(debt)) continue;
    openCount += 1;
    if (dueState(debt, today) === "overdue") overdueCount += 1;
    if (debt.currency !== currency) continue;
    const minor = toMinorUnits(remainingAmount(debt), currency);
    if (debt.kind === "owed") owedMinor += minor;
    else iOweMinor += minor;
  }

  return {
    iOwe: fromMinorUnits(iOweMinor, currency),
    owedToMe: fromMinorUnits(owedMinor, currency),
    openCount,
    overdueCount,
  };
}

/** Open debts first, most urgent on top: overdue, then by due date, then
 * the open-ended ones ("cuando pueda") newest first. Settled ones go last,
 * most recently settled first. */
export function sortDebts(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    const aSettled = isSettled(a);
    const bSettled = isSettled(b);
    if (aSettled !== bSettled) return aSettled ? 1 : -1;
    if (aSettled && bSettled) return (b.settledAt ?? 0) - (a.settledAt ?? 0);
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || b.createdAt - a.createdAt;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  });
}

/**
 * The repayments recorded so far, oldest first. Debts from before the log
 * existed only have a running total, shown as a single undated-ish entry
 * (dated when the debt was created) so the history still adds up.
 */
export function paymentsOf(debt: Debt): DebtPayment[] {
  if (debt.payments && debt.payments.length > 0) return [...debt.payments].sort((a, b) => a.at - b.at);
  if (debt.paidAmount > 0) return [{ amount: debt.paidAmount, date: debt.date, at: debt.createdAt }];
  return [];
}

function sumPayments(payments: DebtPayment[], currency: string): number {
  return fromMinorUnits(
    payments.reduce((sum, p) => sum + toMinorUnits(p.amount, currency), 0),
    currency
  );
}

export interface DebtProgress {
  paidAmount: number;
  payments: DebtPayment[];
  settled: boolean;
}

/** Records a repayment of `amount`, clamped to what's outstanding (paying
 * more than is owed just settles it). Settles the debt if nothing is left. */
export function recordPayment(debt: Debt, amount: number, today: ISODate, now: number): DebtProgress {
  const remainingMinor = toMinorUnits(remainingAmount(debt), debt.currency);
  const paidMinor = Math.min(Math.max(0, toMinorUnits(amount, debt.currency)), remainingMinor);
  const settles = paidMinor >= remainingMinor;
  const payments = paymentsOf(debt);
  if (paidMinor > 0) {
    payments.push({ amount: fromMinorUnits(paidMinor, debt.currency), date: today, at: now, ...(settles ? { closing: true } : {}) });
  }
  return { paidAmount: sumPayments(payments, debt.currency), payments, settled: settles };
}

/** Pays off whatever is left in one go. */
export function settleDebt(debt: Debt, today: ISODate, now: number): DebtProgress {
  const progress = recordPayment(debt, remainingAmount(debt), today, now);
  return { ...progress, settled: true };
}

/** Undoes a settlement: the closing payment comes back out, earlier
 * partial repayments stay. */
export function reopenDebt(debt: Debt): DebtProgress {
  const payments = paymentsOf(debt).filter((p) => !p.closing);
  let paidAmount = sumPayments(payments, debt.currency);
  // A legacy debt settled with the old one-tap check has no closing entry
  // to remove; if it reads as fully paid, reopening would leave nothing
  // to pay, so start it over.
  if (toMinorUnits(paidAmount, debt.currency) >= toMinorUnits(debt.amount, debt.currency)) {
    paidAmount = 0;
    payments.length = 0;
  }
  return { paidAmount, payments, settled: false };
}

/** Rebuilds a debt's state from an edited list of payments: the running
 * total follows, and so does whether it's settled — taking a payment out of
 * a settled debt reopens it, raising one to cover the rest settles it. */
function progressFrom(debt: Debt, payments: DebtPayment[]): DebtProgress {
  const paidMinor = payments.reduce((sum, p) => sum + toMinorUnits(p.amount, debt.currency), 0);
  const settled = paidMinor >= toMinorUnits(debt.amount, debt.currency);
  return {
    paidAmount: fromMinorUnits(paidMinor, debt.currency),
    // "closing" marks the payment that settled it; once edited, none of
    // them is that any more unless the debt is still fully paid.
    payments: payments.map(({ closing, ...p }) => (settled && closing ? { ...p, closing } : p)),
    settled,
  };
}

/** Takes back a payment recorded by mistake (identified by when it was recorded). */
export function removePayment(debt: Debt, at: number): DebtProgress {
  return progressFrom(
    debt,
    paymentsOf(debt).filter((p) => p.at !== at)
  );
}

/** The most a given payment could be changed to: the debt's total minus
 * every other payment. */
export function maxForPayment(debt: Debt, at: number): number {
  const others = paymentsOf(debt)
    .filter((p) => p.at !== at)
    .reduce((sum, p) => sum + toMinorUnits(p.amount, debt.currency), 0);
  return fromMinorUnits(Math.max(toMinorUnits(debt.amount, debt.currency) - others, 0), debt.currency);
}

/** Corrects a payment's amount (clamped to what the debt allows). */
export function updatePayment(debt: Debt, at: number, amount: number): DebtProgress {
  const capped = Math.min(Math.max(amount, 0), maxForPayment(debt, at));
  return progressFrom(
    debt,
    paymentsOf(debt)
      .map((p) => (p.at === at ? { ...p, amount: fromMinorUnits(toMinorUnits(capped, debt.currency), debt.currency) } : p))
      .filter((p) => p.amount > 0)
  );
}

export interface MonthDebtActivity {
  /** Paid back to other people in the month. */
  repaid: number;
  /** Got back from other people in the month. */
  collected: number;
  byPerson: { name: string; repaid: number; collected: number }[];
}

/**
 * Money that moved between the user and other people in `month`
 * ("YYYY-MM"), from the payment logs of every debt, settled or not.
 * Reported next to spending, never inside it: paying back a loan isn't a
 * new expense.
 */
export function debtActivityInMonth(debts: Debt[], month: string, currency: string): MonthDebtActivity {
  const people = new Map<string, { name: string; repaid: number; collected: number }>();
  let repaid = 0;
  let collected = 0;
  for (const d of debts) {
    if (d.kind === "reminder" || d.currency !== currency) continue;
    for (const p of paymentsOf(d)) {
      if (p.date.slice(0, 7) !== month) continue;
      const minor = toMinorUnits(p.amount, currency);
      const name = (d.person ?? "").trim() || "Sin nombre";
      const key = name.toLowerCase();
      const entry = people.get(key) ?? { name, repaid: 0, collected: 0 };
      if (d.kind === "owe") {
        repaid += minor;
        entry.repaid += minor;
      } else {
        collected += minor;
        entry.collected += minor;
      }
      people.set(key, entry);
    }
  }
  return {
    repaid: fromMinorUnits(repaid, currency),
    collected: fromMinorUnits(collected, currency),
    byPerson: [...people.values()]
      .map((e) => ({ name: e.name, repaid: fromMinorUnits(e.repaid, currency), collected: fromMinorUnits(e.collected, currency) }))
      .sort((a, b) => b.repaid + b.collected - (a.repaid + a.collected)),
  };
}
