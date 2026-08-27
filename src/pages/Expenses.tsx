import { useMemo, useState } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { PersonalExpenseCard } from "../components/expense/ExpenseCard";
import { PersonalExpenseSheet } from "../components/expense/PersonalExpenseSheet";
import { RecurringExpenseSheet } from "../components/expense/RecurringExpenseSheet";
import { RecurringBudgetCard } from "../components/expense/RecurringBudgetCard";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { markExpenseDone } from "../services/personalExpenses.service";
import { setRecurringCompletedThisMonth } from "../services/recurringExpenses.service";
import { formatCurrency, formatMonth } from "../lib/format";
import { todayISO } from "../domain/date";
import type { PersonalExpense, RecurringExpense } from "../types";

type Tab = "pasados" | "proximos" | "recurrentes";

const PERIODICITY_LABEL: Record<string, string> = { weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };

export function Expenses() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { expenses, loading } = usePersonalExpenses();
  const { items: recurring, loading: recurringLoading } = useRecurringExpenses();
  const [tab, setTab] = useState<Tab>("pasados");
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null | undefined>(undefined);
  const currentMonth = todayISO().slice(0, 7);

  async function handleMarkDone(expense: PersonalExpense) {
    if (!user) return;
    try {
      await markExpenseDone(user.uid, expense.id);
      show("Gasto marcado como realizado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo marcar el gasto.", "error");
    }
  }

  async function handleToggleRecurringDone(r: RecurringExpense) {
    if (!user) return;
    const done = r.lastCompletedMonth !== currentMonth;
    try {
      await setRecurringCompletedThisMonth(user.uid, r.id, currentMonth, done);
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    }
  }

  const grouped = useMemo(() => {
    const past = expenses.filter((e) => e.status !== "future").sort((a, b) => b.date.localeCompare(a.date));
    const future = expenses.filter((e) => e.status === "future").sort((a, b) => a.date.localeCompare(b.date));
    return { past, future };
  }, [expenses]);

  const monthTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of grouped.past) {
      const key = e.date.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + e.amount);
    }
    return totals;
  }, [grouped.past]);

  return (
    <>
      <TopBar
        title="Gastos"
        subtitle="Tu zona personal"
        right={
          <Button size="icon" variant="secondary" onClick={() => window.location.reload()} aria-label="Refrescar">
            <RefreshCw size={18} strokeWidth={2.1} />
          </Button>
        }
      />
      <PageContainer>
        <div className="mb-5 flex gap-1 rounded-2xl bg-white p-1 shadow-card dark:bg-surface-dark-subtle">
          {(
            [
              ["pasados", "Realizados"],
              ["proximos", "Próximos"],
              ["recurrentes", "Recurrentes"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                tab === key
                  ? "bg-accent text-white"
                  : "text-neutral-500 active:bg-neutral-100 dark:text-neutral-400 dark:active:bg-neutral-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "pasados" &&
          (loading ? (
            <CardListSkeleton />
          ) : grouped.past.length === 0 ? (
            <EmptyState icon="💳" title="Aún no tienes gastos" description="Añade tu primer gasto para empezar." />
          ) : (
            <MonthlyList expenses={grouped.past} totals={monthTotals} onSelect={setEditingExpense} currency={expenses[0]?.currency} />
          ))}

        {tab === "proximos" &&
          (loading ? (
            <CardListSkeleton count={2} />
          ) : grouped.future.length === 0 ? (
            <EmptyState icon="🗓️" title="Sin gastos próximos" description="Los gastos con fecha futura aparecerán aquí." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {grouped.future.map((e) => (
                <PersonalExpenseCard
                  key={e.id}
                  expense={e}
                  onClick={() => setEditingExpense(e)}
                  onMarkDone={() => handleMarkDone(e)}
                />
              ))}
            </div>
          ))}

        {tab === "recurrentes" && (
          <div className="flex flex-col gap-3">
            <RecurringBudgetCard
              recurring={recurring}
              month={currentMonth}
              uid={user?.uid}
              currency={recurring[0]?.currency ?? profile?.currency ?? "EUR"}
            />

            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Tus gastos recurrentes</h2>
              {recurring.length > 0 && (
                <button
                  onClick={() => setEditingRecurring(null)}
                  aria-label="Nuevo gasto recurrente"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent active:scale-95 dark:bg-accent-900/30 dark:text-accent-300"
                >
                  <Plus size={17} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {recurringLoading ? (
                <CardListSkeleton count={2} />
              ) : recurring.length === 0 ? (
                <EmptyState
                  icon="🔁"
                  title="Sin gastos recurrentes"
                  description="Netflix, alquiler, gimnasio... configúralos una vez."
                  action={
                    <Button onClick={() => setEditingRecurring(null)}>
                      <Plus size={17} strokeWidth={2.5} />
                      Nuevo gasto recurrente
                    </Button>
                  }
                />
              ) : (
                recurring.map((r) => {
                  const doneThisMonth = r.lastCompletedMonth === currentMonth;
                  return (
                    <div key={r.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRecurringDone(r)}
                        aria-label={doneThisMonth ? "Marcar como no hecho este mes" : "Marcar como hecho este mes"}
                        aria-pressed={doneThisMonth}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 active:scale-95 ${
                          doneThisMonth
                            ? "border-positive bg-positive text-white"
                            : "border-neutral-300 text-transparent dark:border-neutral-600"
                        }`}
                      >
                        <Check size={15} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => setEditingRecurring(r)}
                        className="flex w-full min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card dark:bg-surface-dark-subtle"
                      >
                        <span className="text-xl">🔁</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.description}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {PERIODICITY_LABEL[r.periodicity]} · día {r.dayOfMonth}
                            {doneThisMonth && " · Hecho este mes"}
                          </p>
                        </div>
                        <span className="font-semibold tabular-nums">{formatCurrency(r.amount, r.currency)}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </PageContainer>

      <PersonalExpenseSheet open={Boolean(editingExpense)} onClose={() => setEditingExpense(null)} expense={editingExpense ?? undefined} />
      <RecurringExpenseSheet
        open={editingRecurring !== undefined}
        onClose={() => setEditingRecurring(undefined)}
        recurring={editingRecurring ?? undefined}
      />
    </>
  );
}

function MonthlyList({
  expenses,
  totals,
  onSelect,
  currency,
}: {
  expenses: PersonalExpense[];
  totals: Map<string, number>;
  onSelect: (e: PersonalExpense) => void;
  currency?: string;
}) {
  let lastMonth = "";
  return (
    <div className="flex flex-col gap-2.5">
      {expenses.map((e) => {
        const month = e.date.slice(0, 7);
        const showHeader = month !== lastMonth;
        lastMonth = month;
        return (
          <div key={e.id}>
            {showHeader && (
              <div className="mb-2 mt-3 flex items-baseline justify-between first:mt-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">{formatMonth(e.date)}</h3>
                <span className="text-xs font-semibold text-neutral-400">
                  {formatCurrency(totals.get(month) ?? 0, (currency as never) ?? "EUR")}
                </span>
              </div>
            )}
            <PersonalExpenseCard expense={e} onClick={() => onSelect(e)} />
          </div>
        );
      })}
    </div>
  );
}
