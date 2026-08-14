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
import type { Payment } from "../types";

function col(groupId: string) {
  return collection(db, "groups", groupId, "payments");
}

function fromSnap(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    groupId: data.groupId as string,
    fromUid: data.fromUid as string,
    toUid: data.toUid as string,
    amount: data.amount as number,
    currency: data.currency as Payment["currency"],
    concept: data.concept as string | undefined,
    status: data.status as Payment["status"],
    createdBy: data.createdBy as string,
    createdAt: tsToMillis(data.createdAt),
    confirmedAt: data.confirmedAt ? tsToMillis(data.confirmedAt) : undefined,
    deleted: (data.deleted as boolean) ?? false,
  };
}

export function subscribeGroupPayments(
  groupId: string,
  onChange: (payments: Payment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(groupId), where("deleted", "==", false), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export interface RecordPaymentInput {
  fromUid: string;
  toUid: string;
  amount: number;
  currency: Payment["currency"];
  concept?: string;
}

/** Records a settlement as already-paid (self-attested, matching how every
 * mainstream splitting app's "mark as paid" works) — reversible via
 * `revertPayment` if it was a mistake. */
export async function recordPayment(groupId: string, createdBy: string, input: RecordPaymentInput) {
  try {
    await addDoc(col(groupId), {
      groupId,
      ...input,
      status: "confirmed",
      createdBy,
      deleted: false,
      createdAt: serverTimestamp(),
      confirmedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Only the creator can revert — enforced by Firestore rules. */
export async function revertPayment(groupId: string, paymentId: string) {
  try {
    await updateDoc(doc(col(groupId), paymentId), { deleted: true, status: "pending" });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
