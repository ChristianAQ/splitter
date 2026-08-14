import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { toFriendlyError } from "../lib/errors";
import { USER_COLOR_PALETTE } from "../lib/userColors";

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUp(name: string, email: string, password: string) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    // No Cloud Function bootstraps this doc — the client is the only
    // writer, so there's no race to guard against here.
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      name: name.trim(),
      email: email.trim(),
      color: USER_COLOR_PALETTE[0].value,
      currency: "EUR",
      theme: "system",
      createdAt: serverTimestamp(),
    });
    return credential.user;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function signIn(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw toFriendlyError(error);
  }
}
