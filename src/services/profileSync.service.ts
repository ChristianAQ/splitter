import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toFriendlyError } from "../lib/errors";

/**
 * Fans a global profile name/color change out to every group the user
 * belongs to. The `members/{uid}` doc in each group is a denormalized copy
 * (kept that way so a group screen never needs to join against `users/`),
 * so nothing shows the new name/color anywhere until this runs.
 */
export async function propagateProfileToGroups(uid: string, changes: { name?: string; color?: string }) {
  if (!changes.name && !changes.color) return;
  try {
    const groupsSnap = await getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", uid)));
    if (groupsSnap.empty) return;

    const batch = writeBatch(db);
    for (const groupDoc of groupsSnap.docs) {
      batch.update(doc(groupDoc.ref, "members", uid), changes);
    }
    await batch.commit();
  } catch (error) {
    throw toFriendlyError(error);
  }
}
