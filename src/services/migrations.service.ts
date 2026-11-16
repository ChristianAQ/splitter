import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { commit } from "../lib/commit";
import { toFriendlyError } from "../lib/errors";
import { isSettled, paymentsOf } from "../domain/debts";
import { localISO } from "../domain/date";
import { fromMinorUnits, toMinorUnits } from "../domain/money";
import type { Debt } from "../types";

/**
 * "Pendiente" used to be a third kind of entry in Deudas: a payment not owed
 * to anyone in particular. It's gone — those are upcoming expenses
 * ("Próximos") now, which can equally be undated and paid in parts, and
 * which (unlike a Pendiente) count as spending once paid.
 *
 * This converts one that's still around:
 *   - still open  -> an upcoming expense for the full amount, plus one paid
 *                    expense per payment already recorded against it;
 *   - settled     -> paid expenses only, one per payment.
 * and then deletes it from Deudas.
 *
 * Document ids are derived from the debt's own id, so running it twice (two
 * devices, a retry after a dropped connection) rewrites the same documents
 * instead of duplicating them.
 */
export async function migrateReminderToExpenses(uid: string, debt: Debt) {
  if (debt.kind !== "reminder") return;
  try {
    const expenses = (id: string) => doc(db, "users", uid, "personalExpenses", id);
    const parentId = `rem-${debt.id}`;
    const common = {
      ownerId: uid,
      currency: debt.currency,
      description: debt.concept || "Pago pendiente",
      categoryId: "otros",
      updatedAt: serverTimestamp(),
    };
    const settled = isSettled(debt);
    const payments = paymentsOf(debt).map((p) => ({ amount: p.amount, date: p.date, at: p.at }));

    if (settled) {
      // Whatever the log doesn't account for was paid when it was settled
      // (settling by the old one-tap check recorded no payment at all).
      const totalMinor = toMinorUnits(debt.amount, debt.currency);
      const loggedMinor = payments.reduce((sum, p) => sum + toMinorUnits(p.amount, debt.currency), 0);
      if (loggedMinor < totalMinor) {
        const at = debt.settledAt ?? debt.updatedAt;
        payments.push({ amount: fromMinorUnits(totalMinor - loggedMinor, debt.currency), date: localISO(new Date(at)), at });
      }
    }

    const writes: Promise<void>[] = [];
    if (!settled) {
      writes.push(
        setDoc(expenses(parentId), {
          ...common,
          amount: debt.amount,
          date: debt.dueDate ?? debt.date,
          status: "future",
          ...(debt.dueDate ? {} : { undated: true }),
          ...(debt.notes ? { notes: debt.notes } : {}),
          createdAt: Timestamp.fromMillis(debt.createdAt),
        })
      );
    }
    payments.forEach((p, i) => {
      writes.push(
        setDoc(expenses(`${parentId}-${i}`), {
          ...common,
          amount: p.amount,
          date: p.date,
          status: "done",
          ...(settled ? { plannedAmount: debt.amount } : { partOfId: parentId }),
          ...(settled && debt.notes ? { notes: debt.notes } : {}),
          createdAt: Timestamp.fromMillis(p.at),
        })
      );
    });
    // Queued after the writes above and sent in that order (see
    // lib/commit.ts), so the debt only goes once its replacements exist.
    writes.push(deleteDoc(doc(db, "users", uid, "debts", debt.id)));
    await commit(Promise.all(writes));
  } catch (error) {
    throw toFriendlyError(error);
  }
}
