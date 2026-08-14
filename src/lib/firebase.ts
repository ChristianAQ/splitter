import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = initializeApp(firebaseConfig);

// Multi-tab IndexedDB persistence: keeps recent data available offline and
// lets Firestore's SDK handle sync/reconciliation when connectivity returns
// (see README "Funcionamiento offline") instead of us hand-rolling a queue.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Several optional fields (notes, description, endDate...) are built as
  // `value || undefined` throughout the service layer so the key is simply
  // omitted when empty — Firestore rejects explicit `undefined` values
  // otherwise, so this makes that pattern actually work as intended.
  ignoreUndefinedProperties: true,
});

export const auth = getAuth(app);

// No Cloud Functions in this app on purpose — everything is a client write
// validated by firestore.rules, so the whole app runs on the free Spark
// plan (Cloud Functions requires Blaze). See firestore.rules' top comment.

// `VITE_USE_FIREBASE_EMULATORS=true npm run dev` (see README) sets this so
// local development never touches a real Firebase project by accident.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
