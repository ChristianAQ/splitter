import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  type Transaction,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import { randomBytes } from "node:crypto";

initializeApp();
const db = getFirestore();

// Ambiguous characters (0/O, 1/I/L) removed so codes are easy to read aloud
// and type on a phone keyboard. 6 chars from this 31-symbol alphabet is
// ~31^6 ≈ 887M combinations — enough that brute-forcing a live code isn't
// practical, especially combined with Firestore's per-project rate limits.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

const MEMBER_COLORS = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
  "#EF4444", "#8B5CF6", "#14B8A6", "#F97316", "#06B6D4",
];

function pickMemberColor(usedColors: string[]): string {
  const free = MEMBER_COLORS.find((c) => !usedColors.includes(c));
  return free ?? MEMBER_COLORS[usedColors.length % MEMBER_COLORS.length];
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCode();
    const existing = await db.collection("inviteCodes").doc(code).get();
    if (!existing.exists) return code;
  }
  throw new HttpsError("resource-exhausted", "No se pudo generar un código único, inténtalo de nuevo.");
}

// ---------------------------------------------------------------------------
// Bootstraps users/{uid} the moment a Firebase Auth account is created, so
// the profile document is guaranteed to exist server-side even if the client
// disconnects mid-onboarding (see services/auth.service.ts, which also
// writes this doc immediately on signup so onboarding never waits on this
// trigger).
//
// Both writers race on the same document, so this runs as a transaction:
// if `users/{uid}` already exists (the client's own signup write landed
// first) we only fill in safe defaults and never touch `name`. If it
// doesn't exist yet, `user.displayName` may not have propagated from
// `updateProfile()` yet either — in that case we fall back to the email's
// local part, but ONLY as the doc's very first write. Firestore aborts and
// retries this transaction if the client's write lands concurrently (it
// read-locks the document), so the fallback name can never clobber the
// real one — whichever write actually creates the document wins, and this
// function backs off to a merge once it sees that.
// ---------------------------------------------------------------------------
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  const ref = db.collection("users").doc(user.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const defaults = {
      uid: user.uid,
      email: user.email ?? "",
      color: MEMBER_COLORS[0],
      currency: "EUR",
      theme: "system",
      createdAt: FieldValue.serverTimestamp(),
    };
    if (snap.exists) {
      tx.set(ref, defaults, { merge: true });
    } else {
      const name = user.displayName?.trim() || user.email?.split("@")[0] || "Usuario";
      tx.set(ref, { ...defaults, name });
    }
  });
});

// ---------------------------------------------------------------------------
// Creates a group. This has to be a Cloud Function rather than a client
// batched write because it must also create `inviteCodes/{code}` — and that
// collection is `write: false` for every client (see firestore.rules) so a
// malicious client can never mint or overwrite an invite-code mapping. This
// function is the single place a group and its first invite code come into
// existence, and it guarantees the code is actually unique.
// ---------------------------------------------------------------------------
export const createGroup = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const name = String(request.data?.name ?? "").trim();
  const description = request.data?.description ? String(request.data.description).trim() : undefined;
  const icon = String(request.data?.icon ?? "💰");
  const color = String(request.data?.color ?? "#6366F1");
  const currency = String(request.data?.currency ?? "EUR");

  if (!name || name.length > 80) {
    throw new HttpsError("invalid-argument", "El grupo necesita un nombre (máx. 80 caracteres).");
  }
  if (!["EUR", "USD", "GBP"].includes(currency)) {
    throw new HttpsError("invalid-argument", "Moneda no soportada.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const userName = (userSnap.data()?.name as string | undefined) ?? "Usuario";
  const userColor = (userSnap.data()?.color as string | undefined) ?? MEMBER_COLORS[0];

  const code = await generateUniqueCode();
  const groupRef = db.collection("groups").doc();

  const batch = db.batch();
  batch.set(groupRef, {
    name,
    ...(description ? { description } : {}),
    icon,
    color,
    currency,
    createdBy: uid,
    inviteCode: code,
    memberIds: [uid],
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(groupRef.collection("members").doc(uid), {
    uid,
    name: userName,
    color: userColor,
    role: "admin",
    joinedAt: FieldValue.serverTimestamp(),
    active: true,
  });
  batch.set(db.collection("inviteCodes").doc(code), {
    groupId: groupRef.id,
    groupName: name,
    icon,
    color,
  });
  batch.set(groupRef.collection("history").doc(), {
    groupId: groupRef.id,
    type: "group_created",
    actorId: uid,
    actorName: userName,
    summary: `${userName} creó el grupo`,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { groupId: groupRef.id, inviteCode: code };
});

// ---------------------------------------------------------------------------
// Join a group by invite code. This is the ONLY way `groups/{id}.memberIds`
// and `groups/{id}/members/{uid}` ever gain a new entry from an untrusted
// client — Firestore rules forbid a client write for either. Using the
// Admin SDK here means we can trust `code` was actually validated against
// the real group instead of trusting a client-asserted groupId.
// ---------------------------------------------------------------------------
export const joinGroupByCode = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const code = String(request.data?.code ?? "").trim().toUpperCase();
  if (!code) throw new HttpsError("invalid-argument", "Introduce un código de invitación.");

  const codeSnap = await db.collection("inviteCodes").doc(code).get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "Ese código de invitación no es válido.");
  }
  const { groupId } = codeSnap.data() as { groupId: string };

  const userSnap = await db.collection("users").doc(uid).get();
  const userName = (userSnap.data()?.name as string | undefined) ?? "Usuario";

  return db.runTransaction(async (tx: Transaction) => {
    const groupRef = db.collection("groups").doc(groupId);
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) {
      throw new HttpsError("not-found", "Este grupo ya no existe.");
    }
    const group = groupSnap.data()!;
    if (group.archivedAt) {
      throw new HttpsError("failed-precondition", "Este grupo está archivado.");
    }

    const memberIds: string[] = group.memberIds ?? [];
    const preview = {
      groupId,
      groupName: group.name as string,
      icon: group.icon as string,
      color: group.color as string,
      alreadyMember: memberIds.includes(uid),
    };
    if (preview.alreadyMember) return preview;

    const membersRef = groupRef.collection("members");
    const existingMembers = await tx.get(membersRef);
    const usedColors = existingMembers.docs.map((d) => d.data().color as string);

    tx.update(groupRef, { memberIds: FieldValue.arrayUnion(uid) });
    tx.set(membersRef.doc(uid), {
      uid,
      name: userName,
      color: pickMemberColor(usedColors),
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
      active: true,
    });
    tx.set(groupRef.collection("history").doc(), {
      groupId,
      type: "member_joined",
      actorId: uid,
      actorName: userName,
      summary: `${userName} se unió al grupo`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return preview;
  });
});

// ---------------------------------------------------------------------------
// Rotates a group's invite code (admin only). Old code stops working
// immediately since its `inviteCodes/{code}` doc is deleted in the same
// transaction.
// ---------------------------------------------------------------------------
export const regenerateInviteCode = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const groupId = String(request.data?.groupId ?? "");
  if (!groupId) throw new HttpsError("invalid-argument", "Falta el identificador del grupo.");

  const groupRef = db.collection("groups").doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) throw new HttpsError("not-found", "Grupo no encontrado.");
  const group = groupSnap.data()!;
  if (group.createdBy !== uid) {
    throw new HttpsError("permission-denied", "Solo el administrador puede regenerar el código.");
  }

  const newCode = await generateUniqueCode();
  const oldCode = group.inviteCode as string | undefined;

  await db.runTransaction(async (tx) => {
    if (oldCode) tx.delete(db.collection("inviteCodes").doc(oldCode));
    tx.set(db.collection("inviteCodes").doc(newCode), {
      groupId,
      groupName: group.name,
      icon: group.icon,
      color: group.color,
    });
    tx.update(groupRef, { inviteCode: newCode });
    tx.set(groupRef.collection("history").doc(), {
      groupId,
      type: "invite_code_regenerated",
      actorId: uid,
      actorName: "",
      summary: "Se regeneró el código de invitación",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { inviteCode: newCode };
});

// ---------------------------------------------------------------------------
// A member leaves a group voluntarily. Like joining, this mutates
// `memberIds`, so it must go through the Admin SDK rather than a client
// write. Refuses if the caller is the admin of a group with other members
// (they'd orphan it) — they must archive it or hand off admin first.
// Leaving is modeled as `active: false`, never a doc delete, so their past
// expenses/payments keep a valid `createdBy`/`paidBy` reference.
// ---------------------------------------------------------------------------
export const leaveGroup = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const groupId = String(request.data?.groupId ?? "");
  if (!groupId) throw new HttpsError("invalid-argument", "Falta el identificador del grupo.");

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) throw new HttpsError("not-found", "Grupo no encontrado.");
    const group = groupSnap.data()!;
    const memberIds: string[] = group.memberIds ?? [];
    if (!memberIds.includes(uid)) return; // already not a member, nothing to do

    if (group.createdBy === uid && memberIds.length > 1) {
      throw new HttpsError(
        "failed-precondition",
        "Eres el administrador y el grupo tiene más miembros. Archívalo antes de salir."
      );
    }

    const remaining = memberIds.filter((id) => id !== uid);
    tx.update(groupRef, {
      memberIds: remaining,
      ...(remaining.length === 0 ? { archivedAt: FieldValue.serverTimestamp() } : {}),
    });
    tx.update(groupRef.collection("members").doc(uid), { active: false });

    const memberSnap = await tx.get(groupRef.collection("members").doc(uid));
    const name = (memberSnap.data()?.name as string) ?? "Alguien";
    tx.set(groupRef.collection("history").doc(), {
      groupId,
      type: "member_left",
      actorId: uid,
      actorName: name,
      summary: `${name} abandonó el grupo`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// ---------------------------------------------------------------------------
// Admin removes another member from the group. Same rationale as
// `leaveGroup` for why this needs the Admin SDK.
// ---------------------------------------------------------------------------
export const removeMember = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const groupId = String(request.data?.groupId ?? "");
  const targetUid = String(request.data?.targetUid ?? "");
  if (!groupId || !targetUid) throw new HttpsError("invalid-argument", "Faltan datos.");
  if (targetUid === uid) {
    throw new HttpsError("invalid-argument", "Usa 'salir del grupo' para eliminarte a ti mismo.");
  }

  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) throw new HttpsError("not-found", "Grupo no encontrado.");
    const group = groupSnap.data()!;
    if (group.createdBy !== uid) {
      throw new HttpsError("permission-denied", "Solo el administrador puede expulsar miembros.");
    }
    const memberIds: string[] = group.memberIds ?? [];
    if (!memberIds.includes(targetUid)) return;

    const memberRef = groupRef.collection("members").doc(targetUid);
    const memberSnap = await tx.get(memberRef);
    const name = (memberSnap.data()?.name as string) ?? "Alguien";

    tx.update(groupRef, { memberIds: memberIds.filter((id) => id !== targetUid) });
    tx.update(memberRef, { active: false });
    tx.set(groupRef.collection("history").doc(), {
      groupId,
      type: "member_removed",
      actorId: uid,
      actorName: name,
      summary: `${name} fue eliminado del grupo`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// ---------------------------------------------------------------------------
// Deletes the caller's account: personal data, membership in groups they
// don't administer, and the Auth user itself. Refuses to delete while the
// caller is the sole admin of a group that still has other members, since
// that would leave the group orphaned — the user must transfer or archive
// it first. Financial history the user is attached to (expenses/payments
// they created) is intentionally left in place for groups they leave, per
// the "never destroy financial history" rule; only their live membership
// and personal data are removed.
// ---------------------------------------------------------------------------
export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const groupsSnap = await db.collection("groups").where("memberIds", "array-contains", uid).get();
  for (const groupDoc of groupsSnap.docs) {
    const group = groupDoc.data();
    if (group.createdBy === uid && (group.memberIds as string[]).length > 1) {
      throw new HttpsError(
        "failed-precondition",
        `Eres administrador de "${group.name}" y tiene más miembros. Archívalo o transfiere la administración antes de eliminar tu cuenta.`
      );
    }
  }

  for (const groupDoc of groupsSnap.docs) {
    const group = groupDoc.data();
    if (group.createdBy === uid) {
      // sole member — safe to archive rather than hard-delete, keeping history consistent
      await groupDoc.ref.update({ archivedAt: FieldValue.serverTimestamp() });
    } else {
      await groupDoc.ref.update({ memberIds: FieldValue.arrayRemove(uid) });
      await groupDoc.ref.collection("members").doc(uid).update({ active: false });
    }
  }

  await deleteSubcollection(db.collection("users").doc(uid).collection("personalExpenses"));
  await deleteSubcollection(db.collection("users").doc(uid).collection("recurringExpenses"));
  await db.collection("users").doc(uid).delete();
  await getAuth().deleteUser(uid);

  return { success: true };
});

async function deleteSubcollection(ref: FirebaseFirestore.CollectionReference, batchSize = 300) {
  const snap = await ref.limit(batchSize).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  if (snap.size === batchSize) await deleteSubcollection(ref, batchSize);
}
