import { deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, collection, type Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError, AppError } from "../lib/errors";
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
 * The "friend code" is just the uid itself — nothing to generate, nothing
 * that can collide. What still needs a write is a small public projection
 * (`friendCodes/{uid}`, keyed by uid instead of a random code) so someone
 * else can preview your name/color before adding you without needing read
 * access to your actual `users/{uid}` profile document (self-only). An
 * idempotent merge-set, safe to call every time the "Amigos"/Perfil screen
 * opens.
 */
export async function ensureFriendCode(uid: string, name: string, color: string): Promise<string> {
  try {
    await setDoc(doc(db, "friendCodes", uid), { uid, name, color }, { merge: true });
    return uid;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export interface FriendCodePreview {
  uid: string;
  name: string;
  color: string;
}

export async function previewFriendCode(uid: string): Promise<FriendCodePreview | null> {
  const trimmed = uid.trim();
  if (!trimmed) return null;
  const snap = await getDoc(doc(db, "friendCodes", trimmed));
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
async function addFriendPair(
  myUid: string,
  myName: string,
  myColor: string,
  theirUid: string,
  theirName: string,
  theirColor: string
): Promise<{ name: string; alreadyFriend: boolean }> {
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
}

/** Someone typed in a code (their uid) — look up the public projection for
 * their name/color, then add both sides. */
export async function addFriendByCode(
  code: string,
  myUid: string,
  myName: string,
  myColor: string
): Promise<{ name: string; alreadyFriend: boolean }> {
  try {
    const preview = await previewFriendCode(code);
    if (!preview) throw new AppError("Ese código de amigo no es válido.");
    return await addFriendPair(myUid, myName, myColor, preview.uid, preview.name, preview.color);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Their uid/name/color are already known firsthand (e.g. from a shared
 * group's member list), so this skips the friendCodes lookup entirely —
 * useful for adding a fellow group member as a friend directly. */
export async function addFriendByUid(
  myUid: string,
  myName: string,
  myColor: string,
  theirUid: string,
  theirName: string,
  theirColor: string
): Promise<{ name: string; alreadyFriend: boolean }> {
  try {
    return await addFriendPair(myUid, myName, myColor, theirUid, theirName, theirColor);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Fans a name/color change out to every friend's copy of me — same idea as
 * profileSync.service.ts's propagateProfileToGroups, but there's no
 * `friends`-wide collection to query the way `groups` can be queried by
 * `memberIds array-contains`. Instead this reads my OWN friends
 * subcollection (friendship here is always mutual — addFriendByCode never
 * creates a one-sided link) and writes my updated copy into each of
 * theirs. Deliberately not a single writeBatch: removeFriend lets someone
 * delete their side of a friendship unilaterally, so one stale/missing
 * target must not abort updating everyone else — each write is
 * independent and failures are swallowed (best-effort sync; the profile
 * save itself already succeeded by the time this runs).
 */
export async function propagateProfileToFriends(uid: string, changes: { name?: string; color?: string }) {
  if (!changes.name && !changes.color) return;
  const friendsSnap = await getDocs(collection(db, "users", uid, "friends"));
  await Promise.allSettled(
    friendsSnap.docs.map((friendDoc) => updateDoc(doc(db, "users", friendDoc.id, "friends", uid), changes))
  );
  // Keep the public preview projection in sync too, so a code shared before
  // a rename/recolor still previews correctly afterward.
  await updateDoc(doc(db, "friendCodes", uid), changes).catch(() => {
    /* no projection yet (never opened Amigos/Perfil) — nothing to sync */
  });
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
