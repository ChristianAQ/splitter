import { useEffect, useState } from "react";

function storageKey(uid: string, month: string) {
  return `splitter-available-money:${uid}:${month}`;
}

/** Persists the "dinero disponible" the user enters for the recurring-expenses
 * calculator, scoped per user and per month (a new month starts blank, since
 * it's meant to be re-entered each time the salary comes in). Stored in
 * localStorage only — it's a personal budgeting aid, not shared data. */
export function useAvailableMoney(uid: string | undefined, month: string) {
  const [raw, setRaw] = useState(() => {
    if (!uid) return "";
    return localStorage.getItem(storageKey(uid, month)) ?? "";
  });

  useEffect(() => {
    if (!uid) return;
    setRaw(localStorage.getItem(storageKey(uid, month)) ?? "");
  }, [uid, month]);

  function setAvailable(value: string) {
    setRaw(value);
    if (!uid) return;
    if (value) localStorage.setItem(storageKey(uid, month), value);
    else localStorage.removeItem(storageKey(uid, month));
  }

  return { raw, setAvailable };
}
