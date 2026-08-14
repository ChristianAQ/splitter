import {
  addDoc,
  collection,
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
import type { ExpenseSplit, GroupExpense, SplitMethod } from "../types";

function col(groupId: string) {
  return collection(db, "groups", groupId, "expenses");
}

function fromSnap(id: string, data: Record<string, unknown>): GroupExpense {
  return {
    id,
    groupId: data.groupId as string,
    createdBy: data.createdBy as string,
    paidBy: data.paidBy as string,
    amount: data.amount as number,
    currency: data.currency as GroupExpense["currency"],
    description: data.description as string,
    categoryId: data.categoryId as string,
    date: data.date as string,
    splitMethod: data.splitMethod as SplitMethod,
    participants: (data.participants as string[]) ?? [],
    splits: (data.splits as ExpenseSplit[]) ?? [],
    notes: data.notes as string | undefined,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
    deleted: (data.deleted as boolean) ?? false,
  };
}

/** Live, non-deleted expenses for a group, newest first. */
export function subscribeGroupExpenses(
  groupId: string,
  onChange: (expenses: GroupExpense[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(groupId), where("deleted", "==", false), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export interface GroupExpenseInput {
  paidBy: string;
  amount: number;
  currency: GroupExpense["currency"];
  description: string;
  categoryId: string;
  date: string;
  splitMethod: SplitMethod;
  participants: string[];
  splits: ExpenseSplit[];
  notes?: string;
}

export async function createGroupExpense(groupId: string, createdBy: string, input: GroupExpenseInput) {
  try {
    await addDoc(col(groupId), {
      groupId,
      createdBy,
      ...input,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Only the creator can call this successfully — enforced by Firestore rules. */
export async function updateGroupExpense(groupId: string, expenseId: string, input: Partial<GroupExpenseInput>) {
  try {
    await updateDoc(doc(col(groupId), expenseId), { ...input, updatedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Soft delete — history/balances remain reconstructable. Creator only. */
export async function deleteGroupExpense(groupId: string, expenseId: string) {
  try {
    await updateDoc(doc(col(groupId), expenseId), { deleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
