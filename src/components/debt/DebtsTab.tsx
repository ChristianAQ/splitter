import { useMemo, useState } from "react";
import { HandCoins, Plus } from "lucide-react";
import { DebtCard } from "./DebtCard";
import { DebtSheet } from "./DebtSheet";
import { CardListSkeleton } from "../ui/Skeleton";
import { Collapsible } from "../ui/Collapsible";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebts } from "../../hooks/useDebts";
import { deleteDebt, restoreDebt, setDebtProgress } from "../../services/debts.service";
import { isSettled, sortDebts, summarizeDebts } from "../../domain/debts";
import { todayISO } from "../../domain/date";
import { formatCurrency } from "../../lib/format";
import type { Debt } from "../../types";

/** "Deudas" tab of Gastos: money borrowed, money lent, and payments not to
 * forget — each with an optional deadline and partial repayments. */
export function DebtsTab() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { debts, loading, error } = useDebts();
  // undefined = closed, null = new, string = editing that id (looked up live
  // so the open sheet reflects repayments as they're recorded).
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const today = todayISO();
  const currency = profile?.currency ?? "EUR";

  const { open, settled } = useMemo(() => {
    const sorted = sortDebts(debts);
    return { open: sorted.filter((d) => !isSettled(d)), settled: sorted.filter(isSettled) };
  }, [debts]);
  const summary = useMemo(() => summarizeDebts(debts, currency, today), [debts, currency, today]);
  const editingDebt = typeof editing === "string" ? debts.find((d) => d.id === editing) : undefined;

  async function handleToggle(debt: Debt) {
    if (!user) return;
    try {
      if (isSettled(debt)) await setDebtProgress(user.uid, debt.id, debt.paidAmount >= debt.amount ? 0 : debt.paidAmount, false);
      else await setDebtProgress(user.uid, debt.id, debt.paidAmount, true);
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    }
  }

  async function handleDelete(debt: Debt) {
    if (!user) return;
    const uid = user.uid;
    try {
      await deleteDebt(uid, debt.id);
      show("Eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restoreDebt(uid, debt).catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
      throw err; // lets the row slide back into place
    }
  }

  const list = (items: Debt[]) => (
    <div className="stagger flex flex-col gap-2.5">
      {items.map((d) => (
        <DebtCard
          key={d.id}
          debt={d}
          today={today}
          onClick={() => setEditing(d.id)}
          onToggleSettled={() => handleToggle(d)}
          onDelete={() => handleDelete(d)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <p className="rounded-[22px] bg-negative/10 p-4 text-sm text-negative">No se han podido cargar tus deudas: {error}</p>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nada apuntado"
          description="Dinero que te han prestado, que has prestado tú, o un pago que no quieres que se te pase."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} strokeWidth={2.5} />
              Apuntar algo
            </Button>
          }
        />
      ) : (
        <>
          <div className="glass grid grid-cols-2 divide-x divide-black/[0.06] rounded-[26px] dark:divide-white/[0.08]">
            <div className="p-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Debes</p>
              <p
                className={`mt-0.5 text-2xl font-semibold tracking-tight tabular-nums ${
                  summary.iOwe > 0 ? "text-negative dark:text-negative-dark" : ""
                }`}
              >
                {formatCurrency(summary.iOwe, currency)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Te deben</p>
              <p
                className={`mt-0.5 text-2xl font-semibold tracking-tight tabular-nums ${
                  summary.owedToMe > 0 ? "text-positive dark:text-positive-dark" : ""
                }`}
              >
                {formatCurrency(summary.owedToMe, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="eyebrow">
              {open.length === 0 ? "Todo saldado" : `Por saldar · ${open.length}`}
              {summary.overdueCount > 0 && (
                <span className="ml-1.5 text-negative">
                  {summary.overdueCount} vencida{summary.overdueCount === 1 ? "" : "s"}
                </span>
              )}
            </h2>
            <button
              onClick={() => setEditing(null)}
              aria-label="Apuntar deuda o pago pendiente"
              className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          </div>

          {open.length > 0 && list(open)}

          {settled.length > 0 && (
            <Collapsible title={`Saldadas · ${settled.length}`} defaultOpen={false}>
              {list(settled)}
            </Collapsible>
          )}
        </>
      )}

      <DebtSheet open={editing !== undefined} onClose={() => setEditing(undefined)} debt={editingDebt} />
    </div>
  );
}
