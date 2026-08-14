import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { tsToMillis } from "../lib/firestoreHelpers";
import { toFriendlyError } from "../lib/errors";
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
    role: data.role as GroupMember["role"],
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

export interface CreateGroupInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  currency: Currency;
}

export async function createGroup(input: CreateGroupInput): Promise<{ groupId: string; inviteCode: string }> {
  try {
    const call = httpsCallable<CreateGroupInput, { groupId: string; inviteCode: string }>(functions, "createGroup");
    const result = await call(input);
    return result.data;
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

export async function joinGroupByCode(code: string): Promise<{ groupId: string; groupName: string; alreadyMember: boolean }> {
  try {
    const call = httpsCallable<{ code: string }, { groupId: string; groupName: string; alreadyMember: boolean }>(
      functions,
      "joinGroupByCode"
    );
    const result = await call({ code });
    return result.data;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  try {
    const call = httpsCallable<{ groupId: string }, { inviteCode: string }>(functions, "regenerateInviteCode");
    const result = await call({ groupId });
    return result.data.inviteCode;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function leaveGroup(groupId: string) {
  try {
    const call = httpsCallable(functions, "leaveGroup");
    await call({ groupId });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function removeMember(groupId: string, targetUid: string) {
  try {
    const call = httpsCallable(functions, "removeMember");
    await call({ groupId, targetUid });
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
