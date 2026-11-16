import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from "firebase/firestore";
import type { DocumentData, DocumentReference, DocumentSnapshot, Query, QuerySnapshot } from "firebase/firestore";
import { toFriendlyError } from "./errors";

// A Firestore write's promise only settles once the *server* has
// acknowledged it — but the write itself is applied to the local cache (and
// shows up in every list on screen) the instant it's made, and is kept in a
// durable queue until it can be sent. Awaiting the promise directly is what
// left "Guardar" spinning: on a phone the connection to Firestore is often
// asleep when the app comes back to the foreground, and the SDK can take
// the better part of a minute to notice and reconnect.
//
// So a write is given a short grace period to fail fast — which is how a
// rejected write behaves when the connection is healthy (a security rule
// said no, the data was invalid) — and after that the UI moves on. If it
// does fail later, the SDK rolls the change back on its own and the late
// handler below tells the user.

const GRACE_MS = 1200;
// Once one write has outlasted its grace period the connection is known to
// be slow, so the ones right behind it (a form usually makes two or three
// in a row) don't each make the user wait the full period again.
const GRACE_WHEN_SLOW_MS = 120;

let connectionSlow = false;
let onLateFailure: (error: Error) => void = () => {};

/** Registered once by the toast layer: how a write that failed *after* the
 * UI had already moved on gets reported. */
export function setLateWriteFailureHandler(handler: (error: Error) => void) {
  onLateFailure = handler;
}

/**
 * Await a write without making the UI wait for the server.
 * Rejects (with the raw error) if the write fails within the grace period;
 * resolves otherwise — either because it was acknowledged, or because it's
 * safely queued and still on its way.
 */
export function commit(write: Promise<unknown>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let waiting = true;
    const timer = setTimeout(() => {
      waiting = false;
      connectionSlow = true;
      resolve();
    }, connectionSlow ? GRACE_WHEN_SLOW_MS : GRACE_MS);

    write.then(
      () => {
        connectionSlow = false;
        if (!waiting) return;
        clearTimeout(timer);
        resolve();
      },
      (error) => {
        if (waiting) {
          clearTimeout(timer);
          reject(error);
        } else {
          onLateFailure(toFriendlyError(error));
        }
      }
    );
  });
}

function withFallback<T>(fromServer: Promise<T>, fromCache: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      fromCache().then(resolve, reject);
    }, connectionSlow ? GRACE_WHEN_SLOW_MS : GRACE_MS);
    fromServer.then(
      (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** `getDoc`, but answers from the local cache if the server is slow to.
 * Returns null when the document isn't known either way. */
export async function getDocSoon(ref: DocumentReference<DocumentData>): Promise<DocumentSnapshot<DocumentData> | null> {
  try {
    return await withFallback(getDoc(ref), () => getDocFromCache(ref));
  } catch (error) {
    // getDocFromCache throws when the document simply isn't cached.
    if ((error as { code?: string }).code === "unavailable") return null;
    throw error;
  }
}

/** `getDocs`, but answers from the local cache if the server is slow to. */
export function getDocsSoon(q: Query<DocumentData>): Promise<QuerySnapshot<DocumentData>> {
  return withFallback(getDocs(q), () => getDocsFromCache(q));
}
