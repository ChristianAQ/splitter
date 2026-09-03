import { collection, deleteField, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toFriendlyError } from "../lib/errors";

interface ProfileChanges {
  name?: string;
  color?: string;
  // null = remove the photo (see users.service.ts's updateUserProfile for
  // why this needs deleteField() rather than a plain undefined).
  photoUrl?: string | null;
}

/**
 * Fans a global profile change out to every group the user belongs to. The
 * `members/{uid}` doc in each group is a denormalized copy (kept that way
 * so a group screen never needs to join against `users/`), so nothing shows
 * the new name/color/photo anywhere until this runs.
 */
export async function propagateProfileToGroups(uid: string, changes: ProfileChanges) {
  if (!changes.name && !changes.color && changes.photoUrl === undefined) return;
  try {
    const { photoUrl, ...rest } = changes;
    const payload: Record<string, unknown> = { ...rest };
    if (photoUrl !== undefined) payload.photoUrl = photoUrl === null ? deleteField() : photoUrl;

    const groupsSnap = await getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", uid)));
    if (groupsSnap.empty) return;

    const batch = writeBatch(db);
    for (const groupDoc of groupsSnap.docs) {
      batch.update(doc(groupDoc.ref, "members", uid), payload);
    }
    await batch.commit();
  } catch (error) {
    throw toFriendlyError(error);
  }
}
