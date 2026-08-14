import { addDoc, collection, limit as fbLimit, onSnapshot, orderBy, query, serverTimestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
import type { HistoryEntry, HistoryEventType } from "../types";

function col(groupId: string) {
  return collection(db, "groups", groupId, "history");
}

function fromSnap(id: string, data: Record<string, unknown>): HistoryEntry {
  return {
    id,
    groupId: data.groupId as string,
    type: data.type as HistoryEventType,
    actorId: data.actorId as string,
    actorName: data.actorName as string,
    summary: data.summary as string,
    entityId: data.entityId as string | undefined,
    createdAt: tsToMillis(data.createdAt),
  };
}

export function subscribeGroupHistory(
  groupId: string,
  onChange: (entries: HistoryEntry[]) => void,
  onError?: (error: Error) => void,
  max = 100
): Unsubscribe {
  const q = query(col(groupId), orderBy("createdAt", "desc"), fbLimit(max));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

/** Logs an expense/payment lifecycle event. Called alongside the mutating
 * write from the UI layer (not a Cloud Function) since it's non-sensitive
 * and append-only — rules guarantee `actorId` can only ever be the caller. */
export async function logHistory(
  groupId: string,
  type: HistoryEventType,
  actorId: string,
  actorName: string,
  summary: string,
  entityId?: string
) {
  try {
    await addDoc(col(groupId), {
      groupId,
      type,
      actorId,
      actorName,
      summary,
      ...(entityId ? { entityId } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
