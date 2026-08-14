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
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
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
}

export async function createRecurringExpense(uid: string, input: RecurringExpenseInput) {
  try {
    await addDoc(col(uid), { ownerId: uid, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateRecurringExpense(uid: string, id: string, input: Partial<RecurringExpenseInput>) {
  try {
    await updateDoc(doc(col(uid), id), { ...input, updatedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function deleteRecurringExpense(uid: string, id: string) {
  try {
    await deleteDoc(doc(col(uid), id));
  } catch (error) {
    throw toFriendlyError(error);
  }
}
