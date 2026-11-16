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
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
import { commit } from "../lib/commit";
import type { PersonalExpense } from "../types";

function col(uid: string) {
  return collection(db, "users", uid, "personalExpenses");
}

function fromSnap(id: string, data: Record<string, unknown>): PersonalExpense {
  return {
    id,
    ownerId: data.ownerId as string,
    amount: data.amount as number,
    currency: data.currency as PersonalExpense["currency"],
    description: data.description as string,
    categoryId: data.categoryId as string,
    date: data.date as string,
    status: data.status as PersonalExpense["status"],
    notes: data.notes as string | undefined,
    recurringSourceId: data.recurringSourceId as string | undefined,
    undated: data.undated === true ? true : undefined,
    partOfId: data.partOfId as string | undefined,
    plannedAmount: data.plannedAmount as number | undefined,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
}

export function subscribePersonalExpenses(
  uid: string,
  onChange: (expenses: PersonalExpense[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(uid), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export function subscribeUpcomingExpenses(
  uid: string,
  onChange: (expenses: PersonalExpense[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(uid), where("status", "==", "future"), orderBy("date", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export interface PersonalExpenseInput {
  amount: number;
  currency: PersonalExpense["currency"];
  description: string;
  categoryId: string;
  date: string;
  status: PersonalExpense["status"];
  notes?: string;
  recurringSourceId?: string;
  /** Upcoming expense with no deadline. */
  undated?: boolean;
}

export async function createPersonalExpense(uid: string, input: PersonalExpenseInput) {
  try {
    await commit(addDoc(col(uid), {
      ownerId: uid,
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updatePersonalExpense(uid: string, id: string, input: Partial<PersonalExpenseInput>) {
  try {
    const payload: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
    // Optional fields the form sends empty are removed, not left as they
    // were (a plain `undefined` is dropped by the client and the old value
    // would survive the edit).
    if ("notes" in input && !input.notes) payload.notes = deleteField();
    if ("undated" in input && !input.undated) payload.undated = deleteField();
    await commit(updateDoc(doc(col(uid), id), payload));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Pays part of an upcoming expense: a new, ordinary paid expense for
 * `amount` dated `today`, pointing back at it. The upcoming expense itself
 * isn't touched — see domain/installments.ts.
 */
export async function payPartOfExpense(uid: string, expense: PersonalExpense, amount: number, today: string) {
  try {
    await commit(
      addDoc(col(uid), {
        ownerId: uid,
        amount,
        currency: expense.currency,
        description: expense.description,
        categoryId: expense.categoryId,
        date: today,
        status: "done",
        partOfId: expense.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Pays off what's left of an upcoming expense, which turns it into a paid
 * one. If earlier parts exist, it becomes the final part: its amount drops
 * to `remaining` (the parts already count on their own days) and the
 * original total is kept in `plannedAmount`.
 *
 * Dated `today` — that's when the money left — unless it's a plain,
 * never-part-paid expense whose planned day has already passed, which
 * keeps that day (ticking off yesterday's expense today).
 */
export async function settleExpense(uid: string, expense: PersonalExpense, remaining: number, hadParts: boolean, today: string) {
  try {
    const keepPlannedDate = !hadParts && !expense.undated && expense.date <= today;
    await commit(
      updateDoc(doc(col(uid), expense.id), {
        status: "done",
        amount: remaining,
        date: keepPlannedDate ? expense.date : today,
        undated: deleteField(),
        ...(hadParts ? { plannedAmount: expense.amount } : {}),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function deletePersonalExpense(uid: string, id: string) {
  try {
    await commit(deleteDoc(doc(col(uid), id)));
  } catch (error) {
    throw toFriendlyError(error);
  }
}


/** Undo for a delete: writes the expense back under its original id, with
 * its original creation time. */
export async function restorePersonalExpense(uid: string, expense: PersonalExpense) {
  try {
    const { id, createdAt, updatedAt: _updatedAt, ...fields } = expense;
    await commit(setDoc(doc(col(uid), id), { ...fields, createdAt: Timestamp.fromMillis(createdAt), updatedAt: serverTimestamp() }));
  } catch (error) {
    throw toFriendlyError(error);
  }
}
