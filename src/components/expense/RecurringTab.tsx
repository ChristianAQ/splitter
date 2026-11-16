import { useMemo, useState } from "react";
import { Check, Plus, Repeat } from "lucide-react";
import { RecurringBudgetCard } from "./RecurringBudgetCard";
import { RecurringExpenseSheet } from "./RecurringExpenseSheet";
import { RecurringDetailSheet } from "./RecurringDetailSheet";
import { BankSummaryCard } from "./BankSummaryCard";
import { BanksSheet } from "./BanksSheet";
import { CardListSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { SwipeToDelete } from "../ui/SwipeToDelete";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRecurringExpenses } from "../../hooks/useRecurringExpenses";
import {
  deleteRecurringExpense,
  restoreRecurringExpense,
  setRecurringCompletedThisMonth,
} from "../../services/recurringExpenses.service";
import { saveBanks } from "../../services/users.service";
import { totalsByBank } from "../../domain/banks";
import { todayISO } from "../../domain/date";
import { bankById } from "../../lib/banks";
import { formatCurrency } from "../../lib/format";
import type { Bank, RecurringExpense } from "../../types";

const PERIODICITY_LABEL: Record<RecurringExpense["periodicity"], string> = { weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };

/**
 * "Fijos": the recurring expenses, ticked off month by month.
 *
 * Each can be assigned the bank it's paid from; the bank's color then marks
 * the row, and the summary card totals what leaves each account — tap a
 * bank there to see only its expenses.
 */
export function RecurringTab() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { items: recurring, loading } = useRecurringExpenses();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurringExpense | null | undefined>(undefined);
  const [managingBanks, setManagingBanks] = useState(false);
  // undefined = every bank; null = the ones with no bank.
  const [bankFilter, setBankFilter] = useState<string | null | undefined>(undefined);

  const month = todayISO().slice(0, 7);
  const banks: Bank[] = useMemo(() => profile?.banks ?? [], [profile?.banks]);
  const currency = recurring[0]?.currency ?? profile?.currency ?? "EUR";

  const { totals, usage } = useMemo(() => {
    const known = new Set(banks.map((b) => b.id));
    const usage: Record<string, number> = {};
    for (const r of recurring) if (r.bankId && known.has(r.bankId)) usage[r.bankId] = (usage[r.bankId] ?? 0) + 1;
    return { totals: totalsByBank(recurring, month, known, currency), usage };
  }, [recurring, banks, month, currency]);

  // A filter pointing at a bank that has since been emptied or removed
  // would show an empty list with no way to tell why.
  const filter = bankFilter !== undefined && totals.some((t) => t.bankId === bankFilter) ? bankFilter : undefined;
  const visible = filter === undefined ? recurring : recurring.filter((r) => (bankById(banks, r.bankId)?.id ?? null) === filter);
  const viewing = viewingId ? recurring.find((r) => r.id === viewingId) : undefined;

  async function handleToggleDone(r: RecurringExpense) {
    if (!user) return;
    try {
      await setRecurringCompletedThisMonth(user.uid, r, month, r.lastCompletedMonth !== month, todayISO());
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    }
  }

  async function handleDelete(r: RecurringExpense) {
    if (!user) return;
    const uid = user.uid;
    try {
      await deleteRecurringExpense(uid, r.id);
      show("Gasto fijo eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restoreRecurringExpense(uid, r).catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
      throw err; // lets the row slide back into place
    }
  }

  async function handleSaveBanks(next: Bank[]) {
    if (!user) return;
    try {
      await saveBanks(user.uid, next);
      show("Bancos guardados", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudieron guardar los bancos.", "error");
      throw err;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <RecurringBudgetCard recurring={recurring} month={month} uid={user?.uid} currency={currency} />

      {recurring.length > 0 && (
        <BankSummaryCard
          banks={banks}
          totals={totals}
          currency={currency}
          selected={filter}
          onSelect={setBankFilter}
          onManage={() => setManagingBanks(true)}
        />
      )}

      <div className="mt-1 flex items-center justify-between">
        <h2 className="eyebrow">
          {filter === undefined ? "Tus gastos fijos" : `${filter === null ? "Sin banco" : bankById(banks, filter)?.name} · ${visible.length}`}
          {filter !== undefined && (
            <button type="button" onClick={() => setBankFilter(undefined)} className="ml-2 font-semibold text-accent dark:text-accent-300">
              Ver todos
            </button>
          )}
        </h2>
        {recurring.length > 0 && (
          <button
            onClick={() => setEditing(null)}
            aria-label="Nuevo gasto fijo"
            className="hit-slop pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {loading ? (
        <CardListSkeleton count={2} />
      ) : recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Sin gastos fijos"
          description="Netflix, alquiler, gimnasio... configúralos una vez y márcalos cada mes."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} strokeWidth={2.5} />
              Nuevo gasto fijo
            </Button>
          }
        />
      ) : (
        <div className="stagger flex flex-col gap-2.5" key={String(filter)}>
          {visible.map((r) => {
            const done = r.lastCompletedMonth === month;
            const bank = bankById(banks, r.bankId);
            return (
              <SwipeToDelete
                key={r.id}
                onDelete={() => handleDelete(r)}
                leading={
                  <button
                    type="button"
                    onClick={() => handleToggleDone(r)}
                    aria-label={done ? `Desmarcar ${r.description} este mes` : `Marcar ${r.description} como pagado este mes`}
                    aria-pressed={done}
                    className={`hit-slop pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      done ? "border-positive bg-positive text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"
                    }`}
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>
                }
              >
                <button type="button" onClick={() => setViewingId(r.id)} className="surface pressable flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left">
                  {/* The bank's color as a slim marker down the side — enough
                   * to tell accounts apart at a glance without an icon on
                   * every row saying the same thing. */}
                  <span
                    aria-hidden
                    className={`h-9 w-1 shrink-0 rounded-full ${bank ? "" : "bg-black/10 dark:bg-white/15"}`}
                    style={bank ? { backgroundColor: bank.color } : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-semibold ${done ? "text-neutral-500 dark:text-neutral-400" : ""}`}>{r.description}</span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {bank && (
                        <span className="flex min-w-0 items-center gap-1 font-medium" style={{ color: bank.color }}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: bank.color }} aria-hidden />
                          <span className="truncate">{bank.name}</span>
                        </span>
                      )}
                      <span className="shrink-0">
                        {bank && "· "}
                        {PERIODICITY_LABEL[r.periodicity]}
                        {r.periodicity === "monthly" && ` · día ${r.dayOfMonth}`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block font-semibold tabular-nums ${done ? "text-neutral-500 dark:text-neutral-400" : ""}`}>
                      {formatCurrency(r.amount, r.currency)}
                    </span>
                    {done && <span className="block text-[11px] font-medium text-positive dark:text-positive-dark">Pagado</span>}
                  </span>
                </button>
              </SwipeToDelete>
            );
          })}
        </div>
      )}

      <RecurringDetailSheet
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        recurring={viewing}
        bank={bankById(banks, viewing?.bankId)}
        doneThisMonth={viewing?.lastCompletedMonth === month}
        onToggleDone={() => {
          if (viewing) void handleToggleDone(viewing);
        }}
        onEdit={() => {
          if (viewing) setEditing(viewing);
          setViewingId(null);
        }}
      />
      <RecurringExpenseSheet open={editing !== undefined} onClose={() => setEditing(undefined)} recurring={editing ?? undefined} />
      <BanksSheet open={managingBanks} onClose={() => setManagingBanks(false)} banks={banks} usage={usage} onSave={handleSaveBanks} />
    </div>
  );
}
