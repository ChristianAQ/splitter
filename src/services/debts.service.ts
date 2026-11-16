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
import type { Debt, DebtKind } from "../types";

// Lives under users/{uid}/, next to personalExpenses and recurringExpenses,
// so it's covered by the same owner-only rule and needs no composite index
// (the only query is a single-field orderBy).
function col(uid: string) {
  return collection(db, "users", uid, "debts");
}

function fromSnap(id: string, data: Record<string, unknown>): Debt {
  return {
    id,
    ownerId: data.ownerId as string,
    kind: data.kind as DebtKind,
    person: data.person as string | undefined,
    concept: data.concept as string | undefined,
    amount: data.amount as number,
    paidAmount: (data.paidAmount as number) ?? 0,
    currency: data.currency as Debt["currency"],
    date: data.date as string,
    dueDate: data.dueDate as string | undefined,
    notes: data.notes as string | undefined,
    settledAt: data.settledAt ? tsToMillis(data.settledAt) : undefined,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
}

export function subscribeDebts(uid: string, onChange: (debts: Debt[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const q = query(col(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export interface DebtInput {
  kind: DebtKind;
  person?: string;
  concept?: string;
  amount: number;
  currency: Debt["currency"];
  date: string;
  dueDate?: string;
  notes?: string;
}

export async function createDebt(uid: string, input: DebtInput) {
  try {
    await addDoc(col(uid), {
      ownerId: uid,
      ...input,
      paidAmount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Optional text/date fields are cleared (not just left as they were) when
 * the form sends them empty — a plain `undefined` would be dropped by the
 * client and the old value would survive the edit. */
export async function updateDebt(uid: string, id: string, input: DebtInput) {
  try {
    await updateDoc(doc(col(uid), id), {
      ...input,
      person: input.person ?? deleteField(),
      concept: input.concept ?? deleteField(),
      dueDate: input.dueDate ?? deleteField(),
      notes: input.notes ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Records how much has been returned so far; `settled` closes the debt. */
export async function setDebtProgress(uid: string, id: string, paidAmount: number, settled: boolean) {
  try {
    await updateDoc(doc(col(uid), id), {
      paidAmount,
      settledAt: settled ? serverTimestamp() : deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function deleteDebt(uid: string, id: string) {
  try {
    await deleteDoc(doc(col(uid), id));
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Undo for a delete: writes it back under its original id, repayments and
 * settled state included. */
export async function restoreDebt(uid: string, debt: Debt) {
  try {
    const { id, createdAt, updatedAt: _updatedAt, settledAt, ...fields } = debt;
    await setDoc(doc(col(uid), id), {
      ...fields,
      settledAt: settledAt === undefined ? undefined : Timestamp.fromMillis(settledAt),
      createdAt: Timestamp.fromMillis(createdAt),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
