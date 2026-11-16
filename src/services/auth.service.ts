import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { toFriendlyError } from "../lib/errors";
import { commit } from "../lib/commit";
import { USER_COLOR_PALETTE } from "../lib/userColors";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates `users/{uid}` for an account that has only just come into being.
 *
 * Firestore keeps a separate outgoing-write queue per signed-in user, and it
 * learns about a new sign-in asynchronously, a beat after Firebase Auth
 * reports it. A write made in that beat is filed under "nobody": it shows
 * up locally for a moment, then vanishes when Firestore switches to the
 * real user, and is never sent. For the profile document that meant an
 * account that looked fine for a few seconds and then silently lost its
 * profile — after which no form in the app would save anything.
 *
 * So first make sure Firestore is really acting as this user: a read of
 * their own profile is refused by the rules until it is, and allowed once
 * it is. Only then write.
 */
async function writeProfileWhenReady(uid: string, data: Record<string, unknown>) {
  const ref = doc(db, "users", uid);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      // Bounded: on a dead connection this would otherwise never settle,
      // and offline there's nothing to wait for anyway.
      await Promise.race([getDocFromServer(ref), sleep(4000)]);
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== "permission-denied") break;
      await sleep(200 * (attempt + 1));
    }
  }
  await commit(setDoc(ref, data));
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUp(name: string, email: string, password: string) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    await writeProfileWhenReady(credential.user.uid, {
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

/** Creates the `users/{uid}` profile doc the first time a Google account
 * signs in — email/password signup does this inline in signUp(), but a
 * Google sign-in can land here from either signInWithGoogle() (popup) or
 * completeGoogleRedirectSignIn() (redirect fallback), so it's shared. */
async function ensureGoogleProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await writeProfileWhenReady(user.uid, {
    uid: user.uid,
    name: user.displayName?.trim() || "Usuario",
    email: user.email ?? "",
    color: USER_COLOR_PALETTE[0].value,
    currency: "EUR",
    theme: "system",
    createdAt: serverTimestamp(),
  });
}

const POPUP_UNAVAILABLE_CODES = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);

/**
 * Popup by default — instant, no page reload. Falls back to a full-page
 * redirect only when the environment can't do popups at all (this app runs
 * installed as a standalone PWA on mobile, where popups are unreliable),
 * never on a plain user cancellation (auth/popup-closed-by-user). The
 * redirect's result is picked up by completeGoogleRedirectSignIn(), called
 * once on app start (see AuthContext) — this function returns null in that
 * case since the page is about to navigate away.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const credential = await signInWithPopup(auth, provider);
    await ensureGoogleProfile(credential.user);
    return credential.user;
  } catch (error) {
    const code = error instanceof Object && "code" in error ? (error as { code?: string }).code : undefined;
    if (code && POPUP_UNAVAILABLE_CODES.has(code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw toFriendlyError(error);
  }
}

/** Finishes a signInWithGoogle() that fell back to a redirect. Safe to call
 * unconditionally on every app start — resolves to nothing if the app
 * isn't returning from a redirect. */
export async function completeGoogleRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    if (result) await ensureGoogleProfile(result.user);
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
