import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDebts } from "./useDebts";
import { migrateReminderToExpenses } from "../services/migrations.service";

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
}
