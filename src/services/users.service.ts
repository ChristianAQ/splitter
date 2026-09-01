import { doc, onSnapshot, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
import type { UserProfile } from "../types";

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      if (!snap.exists()) return onChange(null);
      const data = snap.data();
      onChange({
        uid: snap.id,
        name: data.name,
        email: data.email,
        color: data.color,
        currency: data.currency,
        theme: data.theme,
        createdAt: tsToMillis(data.createdAt),
      });
    },
    (error) => onError?.(toFriendlyError(error))
  );
}

export async function updateUserProfile(uid: string, changes: Partial<Pick<UserProfile, "name" | "color" | "currency" | "theme">>) {
  try {
    await updateDoc(doc(db, "users", uid), changes);
  } catch (error) {
    throw toFriendlyError(error);
  }
}
