import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDebts } from "./useDebts";
import { migrateReminderToExpenses } from "../services/migrations.service";
import { materializeRecurringPayment } from "../services/recurringExpenses.service";
import { useRecurringExpenses } from "./useRecurringExpenses";
import { todayISO } from "../domain/date";

/** Converts any leftover "Pendiente" entries into upcoming expenses the
 * first time they're seen — see services/migrations.service.ts. Mounted
 * once, at the app shell. */
export function useLegacyMigrations() {
  const { user } = useAuth();
  const { show } = useToast();
  const { debts } = useDebts();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;
    const pending = debts.filter((d) => d.kind === "reminder" && !handled.current.has(d.id));
    if (pending.length === 0) return;
    pending.forEach((d) => handled.current.add(d.id));
    Promise.all(pending.map((d) => migrateReminderToExpenses(user.uid, d)))
      .then(() =>
        show(
          pending.length === 1
            ? "Tu pago pendiente está ahora en Gastos → Próximos"
            : `Tus ${pending.length} pagos pendientes están ahora en Gastos → Próximos`
        )
      )
      .catch(() => {
        // Left as it was; it'll be retried the next time the app starts.
        pending.forEach((d) => handled.current.delete(d.id));
      });
  }, [user, debts, show]);

  // Fixed expenses ticked off this month before a tick recorded a paid
  // expense: add the missing expense, so this month's totals don't drop
  // the moment the app updates.
  const { items: recurring } = useRecurringExpenses();
  const materialized = useRef(new Set<string>());
  useEffect(() => {
    if (!user) return;
    const today = todayISO();
    const month = today.slice(0, 7);
    for (const r of recurring) {
      const key = `${r.id}:${month}`;
      if (r.lastCompletedMonth !== month || r.materializedMonth === month || materialized.current.has(key)) continue;
      materialized.current.add(key);
      materializeRecurringPayment(user.uid, r, month, today).catch(() => materialized.current.delete(key));
    }
  }, [user, recurring]);
}
