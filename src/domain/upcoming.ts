import type { Currency, Debt, ISODate, PersonalExpense, RecurringExpense } from "../types";
import { addDays, daysInMonth, formatISO, parseISO } from "./date";
import { isSettled, remainingAmount } from "./debts";
import { occurrencesInRange } from "./recurring";

export type UpcomingKind = "expense" | "recurring" | "debt";

/** One thing the user still has to pay, whatever part of the app it lives in. */
export interface UpcomingPayment {
  key: string;
  kind: UpcomingKind;
  title: string;
  detail: string;
  date: ISODate;
  amount: number;
  currency: Currency;
  overdue: boolean;
}

/** Debts with a deadline further away than this aren't "upcoming" yet. */
const DEBT_HORIZON_DAYS = 45;

/**
 * Everything still to be paid, soonest first: personal expenses dated in
 * the future, this month's fixed expenses not yet ticked off, and money
 * owed (or payments noted down) with a deadline coming up. Money other
 * people owe the user isn't a payment and is left out.
 */
export function upcomingPayments(
  expenses: PersonalExpense[],
  recurring: RecurringExpense[],
  debts: Debt[],
  today: ISODate
): UpcomingPayment[] {
  const items: UpcomingPayment[] = [];
  const month = today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth(year, monthNumber - 1)).padStart(2, "0")}`;
  const debtHorizon = formatISO(addDays(parseISO(today), DEBT_HORIZON_DAYS));

  for (const e of expenses) {
    if (e.status !== "future") continue;
    items.push({
      key: `expense:${e.id}`,
      kind: "expense",
      title: e.description,
      detail: "Gasto programado",
      date: e.date,
      amount: e.amount,
      currency: e.currency,
      overdue: e.date < today,
    });
  }

  for (const r of recurring) {
    if (!r.active || r.lastCompletedMonth === month) continue;
    const dates = occurrencesInRange(r, monthStart, monthEnd);
    if (dates.length === 0) continue;
    // The next one still ahead this month; if they've all gone by, the
    // last one — it's pending either way, but a fixed expense a few days
    // past its usual date isn't flagged as overdue the way a debt is.
    const date = dates.find((d) => d >= today) ?? dates[dates.length - 1];
    items.push({
      key: `recurring:${r.id}`,
      kind: "recurring",
      title: r.description,
      detail: "Gasto fijo",
      date,
      amount: r.amount,
      currency: r.currency,
      overdue: false,
    });
  }

  for (const d of debts) {
    if (isSettled(d) || d.kind === "owed" || !d.dueDate || d.dueDate > debtHorizon) continue;
    items.push({
      key: `debt:${d.id}`,
      kind: "debt",
      title: d.kind === "reminder" ? d.concept || "Pago pendiente" : d.person || "Deuda",
      detail: d.kind === "reminder" ? "Pago pendiente" : "Devolver préstamo",
      date: d.dueDate,
      amount: remainingAmount(d),
      currency: d.currency,
      overdue: d.dueDate < today,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
