import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
import { commit } from "../lib/commit";
import type { RecurringExpense } from "../types";

function col(uid: string) {
  return collection(db, "users", uid, "recurringExpenses");
}

function fromSnap(id: string, data: Record<string, unknown>): RecurringExpense {
  return {
    id,
    ownerId: data.ownerId as string,
    amount: data.amount as number,
    currency: data.currency as RecurringExpense["currency"],
    description: data.description as string,
    categoryId: data.categoryId as string,
    dayOfMonth: data.dayOfMonth as number,
    periodicity: data.periodicity as RecurringExpense["periodicity"],
    startDate: data.startDate as string,
    endDate: data.endDate as string | undefined,
    active: data.active as boolean,
    notes: data.notes as string | undefined,
    bankId: data.bankId as string | undefined,
    lastCompletedMonth: data.lastCompletedMonth as string | undefined,
    materializedMonth: data.materializedMonth as string | undefined,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
}

export function subscribeRecurringExpenses(
  uid: string,
  onChange: (items: RecurringExpense[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export interface RecurringExpenseInput {
  amount: number;
  currency: RecurringExpense["currency"];
  description: string;
  categoryId: string;
  dayOfMonth: number;
  periodicity: RecurringExpense["periodicity"];
  startDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
  bankId?: string;
}

export async function createRecurringExpense(uid: string, input: RecurringExpenseInput) {
  try {
    await commit(addDoc(col(uid), { ownerId: uid, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateRecurringExpense(uid: string, id: string, input: Partial<RecurringExpenseInput>) {
  try {
    const payload: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
    // "No bank" / "no end date" chosen in the form: remove the field rather
    // than leave the previous value (an `undefined` would just be dropped).
    if ("bankId" in input && !input.bankId) payload.bankId = deleteField();
    if ("endDate" in input && !input.endDate) payload.endDate = deleteField();
    await commit(updateDoc(doc(col(uid), id), payload));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function deleteRecurringExpense(uid: string, id: string) {
  try {
    await commit(deleteDoc(doc(col(uid), id)));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Id of the paid expense that stands for `recurringId`'s payment in
 * `month` — derived, so ticking twice (or from two devices) can only ever
 * produce the one document. */
export function recurringPaymentId(recurringId: string, month: string): string {
  return `rec-${recurringId}-${month}`;
}

function paymentRef(uid: string, recurringId: string, month: string) {
  return doc(db, "users", uid, "personalExpenses", recurringPaymentId(recurringId, month));
}

function paymentDoc(uid: string, r: RecurringExpense, date: string) {
  return {
    ownerId: uid,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    categoryId: r.categoryId,
    date,
    status: "done",
    recurringSourceId: r.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Ticks a fixed expense off as paid for `month` ("YYYY-MM"), or unticks it.
 *
 * Ticking also records the payment as an ordinary paid expense dated
 * `today`; unticking removes it. That expense is what makes fixed costs
 * show up in monthly totals, category breakdowns and month-to-month
 * comparisons like any other spending — and stay there in later months,
 * and even if the fixed expense itself is edited or deleted afterwards.
 * (The tick alone only ever remembered the latest month.)
 */
export async function setRecurringCompletedThisMonth(uid: string, r: RecurringExpense, month: string, done: boolean, today: string) {
  try {
    const recurringRef = doc(col(uid), r.id);
    const writes = done
      ? [
          updateDoc(recurringRef, { lastCompletedMonth: month, materializedMonth: month, updatedAt: serverTimestamp() }),
          setDoc(paymentRef(uid, r.id, month), paymentDoc(uid, r, today)),
        ]
      : [
          updateDoc(recurringRef, { lastCompletedMonth: deleteField(), materializedMonth: deleteField(), updatedAt: serverTimestamp() }),
          deleteDoc(paymentRef(uid, r.id, month)),
        ];
    await commit(Promise.all(writes));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** For a fixed expense ticked off before ticking recorded an expense: adds
 * the missing one. Idempotent. */
export async function materializeRecurringPayment(uid: string, r: RecurringExpense, month: string, today: string) {
  try {
    await commit(
      Promise.all([
        setDoc(paymentRef(uid, r.id, month), paymentDoc(uid, r, today)),
        updateDoc(doc(col(uid), r.id), { materializedMonth: month }),
      ])
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Keeps a fixed expense's tick in step when its recorded payment is deleted
 * from (or restored to) the list of paid expenses directly. Quietly does
 * nothing if the fixed expense no longer exists.
 */
export async function syncRecurringTick(uid: string, recurringId: string, month: string, done: boolean) {
  try {
    await commit(
      updateDoc(
        doc(col(uid), recurringId),
        done ? { lastCompletedMonth: month, materializedMonth: month } : { lastCompletedMonth: deleteField(), materializedMonth: deleteField() }
      )
    );
  } catch {
    /* the fixed expense is gone; its past payments are just expenses now */
  }
}

/** Undo for a delete: writes it back under its original id. */
export async function restoreRecurringExpense(uid: string, recurring: RecurringExpense) {
  try {
    const { id, createdAt, updatedAt: _updatedAt, ...fields } = recurring;
    await commit(setDoc(doc(col(uid), id), { ...fields, createdAt: Timestamp.fromMillis(createdAt), updatedAt: serverTimestamp() }));
  } catch (error) {
    throw toFriendlyError(error);
  }
}
