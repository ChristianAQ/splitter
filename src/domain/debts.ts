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
