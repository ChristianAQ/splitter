import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError, AppError } from "../lib/errors";
import { generateInviteCode } from "../lib/inviteCode";
import { USER_COLOR_PALETTE } from "../lib/userColors";
import { logHistory } from "./history.service";
import type { Currency, Group, GroupMember } from "../types";

function fromGroupSnap(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name: data.name as string,
    description: data.description as string | undefined,
    icon: data.icon as string,
    color: data.color as string,
    currency: data.currency as Currency,
    createdBy: data.createdBy as string,
    inviteCode: data.inviteCode as string,
    memberIds: (data.memberIds as string[]) ?? [],
    createdAt: tsToMillis(data.createdAt),
    archivedAt: data.archivedAt ? tsToMillis(data.archivedAt) : undefined,
  };
}

function fromMemberSnap(id: string, data: Record<string, unknown>): GroupMember {
  return {
    uid: id,
    name: data.name as string,
    color: data.color as string,
    joinedAt: tsToMillis(data.joinedAt),
    active: data.active as boolean,
  };
}

export function subscribeUserGroups(
  uid: string,
  onChange: (groups: Group[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, "groups"), where("memberIds", "array-contains", uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromGroupSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

export function subscribeGroup(
  groupId: string,
  onChange: (group: Group | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "groups", groupId),
    (snap) => onChange(snap.exists() ? fromGroupSnap(snap.id, snap.data()) : null),
    (error) => onError?.(toFriendlyError(error))
  );
}

export function subscribeMembers(
  groupId: string,
  onChange: (members: GroupMember[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, "groups", groupId, "members"), orderBy("joinedAt", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => fromMemberSnap(d.id, d.data()))),
    (error) => onError?.(toFriendlyError(error))
  );
}

/** Picks the first palette color not already used by an active member. */
async function pickFreeColor(groupId: string): Promise<string> {
  const snap = await getDocs(collection(db, "groups", groupId, "members"));
  const used = new Set(snap.docs.map((d) => d.data().color as string));
  const free = USER_COLOR_PALETTE.find((c) => !used.has(c.value));
  return free?.value ?? USER_COLOR_PALETTE[snap.size % USER_COLOR_PALETTE.length].value;
}

/** Generates a code and retries on the (astronomically unlikely) chance it
 * already exists — see lib/inviteCode.ts for the entropy math. */
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateInviteCode();
    const existing = await getDoc(doc(db, "inviteCodes", code));
    if (!existing.exists()) return code;
  }
  throw new AppError("No se pudo generar un código único, inténtalo de nuevo.");
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  currency: Currency;
}

/**
 * Pure client-side, Spark-plan-friendly group creation: three sequential
 * writes (not one atomic batch) so each one can safely `get()` the state
 * the previous write just committed — see the comment at the top of
 * firestore.rules for why that ordering matters.
 */
export async function createGroup(
  input: CreateGroupInput,
  creatorUid: string,
  creatorName: string,
  creatorColor: string
): Promise<{ groupId: string; inviteCode: string }> {
  try {
    const inviteCode = await generateUniqueInviteCode();
    const groupRef = doc(collection(db, "groups"));

    await setDoc(groupRef, {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      icon: input.icon,
      color: input.color,
      currency: input.currency,
      createdBy: creatorUid,
      inviteCode,
      memberIds: [creatorUid],
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(groupRef, "members", creatorUid), {
      uid: creatorUid,
      name: creatorName,
      color: creatorColor,
      joinedAt: serverTimestamp(),
      active: true,
    });

    await setDoc(doc(db, "inviteCodes", inviteCode), {
      groupId: groupRef.id,
      groupName: input.name,
      icon: input.icon,
      color: input.color,
    });

    await logHistory(groupRef.id, "group_created", creatorUid, creatorName, `${creatorName} creó el grupo`);

    return { groupId: groupRef.id, inviteCode };
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateGroup(
  groupId: string,
  changes: Partial<Pick<Group, "name" | "description" | "icon" | "color">>
) {
  try {
    await updateDoc(doc(db, "groups", groupId), changes);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function archiveGroup(groupId: string) {
  try {
    await updateDoc(doc(db, "groups", groupId), { archivedAt: serverTimestamp() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export interface InvitePreview {
  groupId: string;
  groupName: string;
  icon: string;
  color: string;
}

export async function previewInviteCode(code: string): Promise<InvitePreview | null> {
  const snap = await getDoc(doc(db, "inviteCodes", code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { groupId: data.groupId, groupName: data.groupName, icon: data.icon, color: data.color };
}

export async function joinGroupByCode(
  code: string,
  uid: string,
  name: string
): Promise<{ groupId: string; groupName: string; alreadyMember: boolean }> {
  try {
    const normalized = code.trim().toUpperCase();
    const codeSnap = await getDoc(doc(db, "inviteCodes", normalized));
    if (!codeSnap.exists()) {
      throw new AppError("Ese código de invitación no es válido.");
    }
    const { groupId, groupName } = codeSnap.data() as { groupId: string; groupName: string };
    const groupRef = doc(db, "groups", groupId);

    // No pre-read here on purpose: `groups/{id}`'s read rule requires
    // already being a member, so a not-yet-member client can't `get()` it
    // first to check `archivedAt`/existing membership — that's enforced by
    // the write rule instead (see firestore.rules). This narrow write is
    // the only way to find out; a permission-denied here means either the
    // caller is already a member or the group is archived.
    try {
      await updateDoc(groupRef, { memberIds: arrayUnion(uid) });
    } catch (joinError) {
      if (joinError instanceof Error && "code" in joinError && (joinError as { code?: string }).code === "permission-denied") {
        return { groupId, groupName, alreadyMember: true };
      }
      throw joinError;
    }

    // Now a member, so members/{uid} and the members subcollection are
    // readable — reactivate a prior membership (rejoin-after-leaving) or
    // create a fresh one.
    const memberRef = doc(groupRef, "members", uid);
    const [existingMember, color] = await Promise.all([getDoc(memberRef), pickFreeColor(groupId)]);
    if (existingMember.exists()) {
      await updateDoc(memberRef, { active: true, color });
    } else {
      await setDoc(memberRef, { uid, name, color, joinedAt: serverTimestamp(), active: true });
    }
    await logHistory(groupId, "member_joined", uid, name, `${name} se unió al grupo`);

    return { groupId, groupName, alreadyMember: false };
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function regenerateInviteCode(groupId: string, adminUid: string, adminName: string): Promise<string> {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new AppError("Grupo no encontrado.");
    const oldCode = groupSnap.data().inviteCode as string | undefined;

    const newCode = await generateUniqueInviteCode();
    await setDoc(doc(db, "inviteCodes", newCode), {
      groupId,
      groupName: groupSnap.data().name,
      icon: groupSnap.data().icon,
      color: groupSnap.data().color,
    });
    await updateDoc(groupRef, { inviteCode: newCode });
    if (oldCode) await deleteDoc(doc(db, "inviteCodes", oldCode));
    await logHistory(groupId, "invite_code_regenerated", adminUid, adminName, "Se regeneró el código de invitación");

    return newCode;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** A member leaves voluntarily. Refuses if the caller is the group's admin
 * and other members remain (they'd orphan it) — archive it first instead.
 * If they're the last member, the group is archived automatically as part
 * of leaving. */
export async function leaveGroup(groupId: string, uid: string, name: string) {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;
    const group = groupSnap.data();
    const memberIds = (group.memberIds as string[]) ?? [];
    if (!memberIds.includes(uid)) return;

    if (group.createdBy === uid && memberIds.length > 1) {
      throw new AppError("Eres el administrador y el grupo tiene más miembros. Archívalo antes de salir.");
    }

    // Order matters — see firestore.rules comment.
    await logHistory(groupId, "member_left", uid, name, `${name} abandonó el grupo`);
    await updateDoc(doc(groupRef, "members", uid), { active: false });
    await updateDoc(groupRef, { memberIds: arrayRemove(uid) });
    if (memberIds.length === 1) {
      await updateDoc(groupRef, { archivedAt: serverTimestamp() });
    }
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Admin removes another member. */
export async function removeMember(groupId: string, targetUid: string, adminUid: string) {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new AppError("Grupo no encontrado.");
    const group = groupSnap.data();
    if (group.createdBy !== adminUid) {
      throw new AppError("Solo el administrador puede expulsar miembros.");
    }
    if (targetUid === adminUid) {
      throw new AppError("Usa 'salir del grupo' para eliminarte a ti mismo.");
    }

    const targetSnap = await getDoc(doc(groupRef, "members", targetUid));
    const targetName = (targetSnap.data()?.name as string) ?? "Alguien";

    await logHistory(groupId, "member_removed", adminUid, targetName, `${targetName} fue eliminado del grupo`);
    await updateDoc(doc(groupRef, "members", targetUid), { active: false });
    await updateDoc(groupRef, { memberIds: arrayRemove(targetUid) });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Admin adds friends directly as members, no invite code needed. Mirrors
 * joinGroupByCode's write order exactly (memberIds first, member doc
 * second) because the members/{uid} create rule requires memberUid to
 * already be listed in the group's memberIds before that doc can be
 * created — true for a self-join and, with this same ordering, equally
 * true here. Sequential per friend (like createGroup's own writes) so
 * pickFreeColor sees each previous member before assigning the next color.
 */
export async function addFriendsToGroup(
  groupId: string,
  adminUid: string,
  adminName: string,
  friends: { uid: string; name: string }[]
) {
  try {
    const groupRef = doc(db, "groups", groupId);
    for (const friend of friends) {
      await updateDoc(groupRef, { memberIds: arrayUnion(friend.uid) });
      const color = await pickFreeColor(groupId);
      await setDoc(doc(groupRef, "members", friend.uid), {
        uid: friend.uid,
        name: friend.name,
        color,
        joinedAt: serverTimestamp(),
        active: true,
      });
      await logHistory(groupId, "member_joined", adminUid, adminName, `${friend.name} fue añadido al grupo por ${adminName}`);
    }
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateMemberColor(groupId: string, uid: string, color: string) {
  try {
    await updateDoc(doc(db, "groups", groupId, "members", uid), { color });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function renameMember(groupId: string, uid: string, name: string) {
  try {
    await updateDoc(doc(db, "groups", groupId, "members", uid), { name: name.trim() });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
