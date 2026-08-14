import type { GroupExpense, MemberBalance, Payment } from "../types";
import { fromMinorUnits, toMinorUnits } from "./money";

/**
 * Computes, for every member of a group, how much they paid, how much they
 * should have paid (their share across all expenses), and their net balance
 * (paid - owed, adjusted for confirmed settlement payments).
 *
 * net > 0  → the group owes this member money.
 * net < 0  → this member owes the group money.
 *
 * Deleted expenses/payments are ignored. Only `status === "confirmed"`
 * payments move money — a "pending" payment (reserved for a future
 * two-party confirmation flow) never changes balances on its own.
 */
export function computeBalances(
  memberIds: string[],
  expenses: GroupExpense[],
  payments: Payment[],
  currency: string
): MemberBalance[] {
  const paidMinor = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const owedMinor = new Map<string, number>(memberIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    if (expense.deleted) continue;
    bump(paidMinor, expense.paidBy, toMinorUnits(expense.amount, currency));
    for (const split of expense.splits) {
      bump(owedMinor, split.uid, toMinorUnits(split.amount, currency));
    }
  }

  const netMinor = new Map<string, number>(
    memberIds.map((id) => [id, (paidMinor.get(id) ?? 0) - (owedMinor.get(id) ?? 0)])
  );

  for (const payment of payments) {
    if (payment.deleted || payment.status !== "confirmed") continue;
    const amountMinor = toMinorUnits(payment.amount, currency);
    bump(netMinor, payment.fromUid, amountMinor); // debtor's debt shrinks
    bump(netMinor, payment.toUid, -amountMinor); // creditor's credit shrinks
  }

  return memberIds.map((uid) => ({
    uid,
    paid: fromMinorUnits(paidMinor.get(uid) ?? 0, currency),
    owed: fromMinorUnits(owedMinor.get(uid) ?? 0, currency),
    net: fromMinorUnits(netMinor.get(uid) ?? 0, currency),
  }));
}

function bump(map: Map<string, number>, key: string, delta: number) {
  map.set(key, (map.get(key) ?? 0) + delta);
}
