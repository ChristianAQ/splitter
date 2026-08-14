import { deleteUser } from "firebase/auth";
import { arrayRemove, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AppError, toFriendlyError } from "../lib/errors";
import { logHistory } from "./history.service";

async function deleteAllDocs(collectionPath: ReturnType<typeof collection>) {
  const snap = await getDocs(collectionPath);
  if (snap.empty) return;
  // Firestore batches cap at 500 writes; personal collections realistically
  // never get close, but chunk defensively anyway.
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Client-side account deletion cascade (no Cloud Function — Spark-plan
 * friendly). Refuses up front if the user is the sole admin of any group
 * that still has other members, since deleting their account would orphan
 * it; they need to archive it or hand off admin first. Order:
 * 1) validate, 2) leave/archive groups, 3) delete personal data,
 * 4) delete the users/{uid} doc, 5) delete the Auth user.
 */
export async function deleteAccount(uid: string, name: string) {
  try {
    const groupsSnap = await getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", uid)));
    const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; createdBy: string; memberIds: string[]; name: string });

    const blockers = groups.filter((g) => g.createdBy === uid && g.memberIds.length > 1);
    if (blockers.length > 0) {
      throw new AppError(
        `Eres administrador de "${blockers[0].name}" y tiene más miembros. Archívalo o transfiere la administración antes de eliminar tu cuenta.`
      );
    }

    for (const group of groups) {
      const groupRef = doc(db, "groups", group.id);
      if (group.createdBy === uid) {
        // sole member — safe to archive rather than orphan
        await updateDoc(groupRef, { archivedAt: serverTimestamp() });
      } else {
        await logHistory(group.id, "member_left", uid, name, `${name} abandonó el grupo`);
        await updateDoc(doc(groupRef, "members", uid), { active: false });
        await updateDoc(groupRef, { memberIds: arrayRemove(uid) });
      }
    }

    await deleteAllDocs(collection(db, "users", uid, "personalExpenses"));
    await deleteAllDocs(collection(db, "users", uid, "recurringExpenses"));
    await deleteDoc(doc(db, "users", uid));

    if (auth.currentUser) await deleteUser(auth.currentUser);
  } catch (error) {
    throw toFriendlyError(error);
  }
}
