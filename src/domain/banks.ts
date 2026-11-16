import type { RecurringExpense } from "../types";
import { fromMinorUnits, toMinorUnits } from "./money";

export interface BankTotal {
  /** null gathers everything with no bank, or a bank that no longer exists. */
  bankId: string | null;
  count: number;
  /** Everything paid from this bank in a month. */
  total: number;
  /** The part of it not yet ticked off for `month`. */
  pending: number;
}

/**
 * Fixed expenses totalled per bank, biggest first, with the "no bank" group
 * last. Amounts are added as they are, whatever each one's periodicity —
 * the same convention the Fijos tab's own total uses.
 */
export function totalsByBank(recurring: RecurringExpense[], month: string, knownBankIds: ReadonlySet<string>, currency: string): BankTotal[] {
  const byBank = new Map<string | null, { count: number; total: number; pending: number }>();
  for (const r of recurring) {
    if (r.currency !== currency) continue;
    const key = r.bankId && knownBankIds.has(r.bankId) ? r.bankId : null;
    const entry = byBank.get(key) ?? { count: 0, total: 0, pending: 0 };
    const minor = toMinorUnits(r.amount, currency);
    entry.count += 1;
    entry.total += minor;
    if (r.lastCompletedMonth !== month) entry.pending += minor;
    byBank.set(key, entry);
  }
  return [...byBank.entries()]
    .map(([bankId, e]) => ({ bankId, count: e.count, total: fromMinorUnits(e.total, currency), pending: fromMinorUnits(e.pending, currency) }))
    .sort((a, b) => (a.bankId === null ? 1 : b.bankId === null ? -1 : b.total - a.total));
}
