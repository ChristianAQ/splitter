import { deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, collection, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError, AppError } from "../lib/errors";
import { generateInviteCode } from "../lib/inviteCode";
import type { Friend } from "../types";

function col(uid: string) {
  return collection(db, "users", uid, "friends");
}

function fromSnap(id: string, data: Record<string, unknown>): Friend {
  return {
    uid: id,
    name: data.name as string,
    color: data.color as string,
    addedAt: tsToMillis(data.addedAt),
  };
}

export function subscribeFriends(
  uid: string,
  onChange: (friends: Friend[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(col(uid), orderBy("name", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

/**
 * Returns the user's existing friend code, or lazily generates one — same
 * random-code-with-collision-retry approach as group invite codes (see
 * generateInviteCode / groups.service.ts), just scoped to its own top-level
 * `friendCodes/` collection. The code's name/color are denormalized onto the
 * `friendCodes/{code}` doc (like `inviteCodes/{code}` denormalizes the group's
 * name/icon/color) so previewing a code never needs to read someone else's
 * profile document.
 */
export async function ensureFriendCode(uid: string, currentCode: string | undefined, name: string, color: string): Promise<string> {
  if (currentCode) return currentCode;
  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = generateInviteCode();
      const existing = await getDoc(doc(db, "friendCodes", code));
      if (existing.exists()) continue;
      await setDoc(doc(db, "friendCodes", code), { uid, name, color });
      await updateDoc(doc(db, "users", uid), { friendCode: code });
      return code;
    }
    throw new AppError("No se pudo generar un código único, inténtalo de nuevo.");
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export interface FriendCodePreview {
  uid: string;
  name: string;
  color: string;
}

export async function previewFriendCode(code: string): Promise<FriendCodePreview | null> {
  const snap = await getDoc(doc(db, "friendCodes", code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid: data.uid as string, name: data.name as string, color: data.color as string };
}

/**
 * Adds each other as friends in one step (no accept flow): writes my own
 * copy of them into my subcollection (I own that path outright, same as
 * personalExpenses/recurringExpenses) and my copy into theirs, keyed by my
 * own uid — the same "write your own doc inside someone else's owned
 * collection" pattern group membership already relies on (see
 * groups.service.ts's joinGroupByCode writing `members/{myUid}`).
 */
export async function addFriendByCode(
  code: string,
  myUid: string,
  myName: string,
  myColor: string
): Promise<{ name: string; alreadyFriend: boolean }> {
  try {
    const normalized = code.trim().toUpperCase();
    const codeSnap = await getDoc(doc(db, "friendCodes", normalized));
    if (!codeSnap.exists()) throw new AppError("Ese código de amigo no es válido.");
    const { uid: theirUid, name: theirName, color: theirColor } = codeSnap.data() as { uid: string; name: string; color: string };

    if (theirUid === myUid) throw new AppError("Ese es tu propio código.");

    const existing = await getDoc(doc(db, "users", myUid, "friends", theirUid));
    if (existing.exists()) return { name: theirName, alreadyFriend: true };

    await setDoc(doc(db, "users", theirUid, "friends", myUid), {
      uid: myUid,
      name: myName,
      color: myColor,
      addedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "users", myUid, "friends", theirUid), {
      uid: theirUid,
      name: theirName,
      color: theirColor,
      addedAt: serverTimestamp(),
    });

    return { name: theirName, alreadyFriend: false };
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Removes a friend from my own list only — the other side keeps me in
 * theirs unless they remove me too, same one-sided-leave model as a group
 * member leaving without notifying the rest to reciprocate anything. */
export async function removeFriend(myUid: string, friendUid: string) {
  try {
    await deleteDoc(doc(db, "users", myUid, "friends", friendUid));
  } catch (error) {
    throw toFriendlyError(error);
  }
}
