import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
    // Belt-and-suspenders with the `onUserCreate` Cloud Function: this write
    // lands immediately so onboarding never waits on a trigger round-trip.
    // Deliberately omits `createdAt` — the security rules treat it as
    // immutable once set (`unchanged('createdAt')` on update), and the
    // function's trigger typically wins the race to create the doc first,
    // which would turn this into an update that tries to overwrite it with
    // a new serverTimestamp() and gets rejected. Whichever write actually
    // creates the document sets `createdAt`; this one only ever touches the
    // fields the user controls.
    await setDoc(
      doc(db, "users", credential.user.uid),
      {
        uid: credential.user.uid,
        name: name.trim(),
        email: email.trim(),
        color: USER_COLOR_PALETTE[0].value,
        currency: "EUR",
        theme: "system",
      },
      { merge: true }
    );
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
