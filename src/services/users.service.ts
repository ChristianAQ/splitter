import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, updateDoc, type Unsubscribe } from "firebase/firestore";
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
        accentColor: data.accentColor,
        photoUrl: data.photoUrl,
        archivedGroupIds: Array.isArray(data.archivedGroupIds) ? data.archivedGroupIds : [],
        createdAt: tsToMillis(data.createdAt),
      });
    },
    (error) => onError?.(toFriendlyError(error))
  );
}

export async function updateUserProfile(
  uid: string,
  changes: Partial<Pick<UserProfile, "name" | "color" | "currency" | "theme" | "accentColor">> & {
    // `undefined` here means "not part of this update" (the db client already
    // drops those keys — see lib/firebase.ts's ignoreUndefinedProperties);
    // `null` means "remove the photo", which needs the deleteField() sentinel
    // since a plain undefined would otherwise leave the old value in place.
    photoUrl?: string | null;
  }
) {
  try {
    const { photoUrl, ...rest } = changes;
    const payload: Record<string, unknown> = { ...rest };
    if (photoUrl !== undefined) payload.photoUrl = photoUrl === null ? deleteField() : photoUrl;
    await updateDoc(doc(db, "users", uid), payload);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Personal, reversible archive: only touches the caller's own profile, so
 * any member can do it (no admin rights needed) and nobody else's view of
 * the group changes. */
export async function setGroupArchivedForMe(uid: string, groupId: string, archived: boolean) {
  try {
    await updateDoc(doc(db, "users", uid), {
      archivedGroupIds: archived ? arrayUnion(groupId) : arrayRemove(groupId),
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
