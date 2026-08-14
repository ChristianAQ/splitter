import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
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
}

export async function createPersonalExpense(uid: string, input: PersonalExpenseInput) {
  try {
    await addDoc(col(uid), {
      ownerId: uid,
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updatePersonalExpense(uid: string, id: string, input: Partial<PersonalExpenseInput>) {
  try {
    await updateDoc(doc(col(uid), id), { ...input, updatedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function deletePersonalExpense(uid: string, id: string) {
  try {
    await deleteDoc(doc(col(uid), id));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function markExpenseDone(uid: string, id: string) {
  return updatePersonalExpense(uid, id, { status: "done" });
}
