import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { PersonalExpenseCard } from "../components/expense/ExpenseCard";
import { PersonalExpenseSheet } from "../components/expense/PersonalExpenseSheet";
import { RecurringExpenseSheet } from "../components/expense/RecurringExpenseSheet";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { formatCurrency, formatMonth } from "../lib/format";
import type { PersonalExpense, RecurringExpense } from "../types";

type Tab = "pasados" | "proximos" | "recurrentes";

const PERIODICITY_LABEL: Record<string, string> = { weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };

export function Expenses() {
  const { expenses, loading } = usePersonalExpenses();
  const { items: recurring, loading: recurringLoading } = useRecurringExpenses();
  const [tab, setTab] = useState<Tab>("pasados");
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null | undefined>(undefined);

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
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
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
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === key ? "bg-accent text-white" : "bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
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
                <PersonalExpenseCard key={e.id} expense={e} onClick={() => setEditingExpense(e)} />
              ))}
            </div>
          ))}

        {tab === "recurrentes" && (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setEditingRecurring(null)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 py-4 text-sm font-semibold text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
            >
              + Nuevo gasto recurrente
            </button>
            {recurringLoading ? (
              <CardListSkeleton count={2} />
            ) : recurring.length === 0 ? (
              <EmptyState icon="🔁" title="Sin gastos recurrentes" description="Netflix, alquiler, gimnasio... configúralos una vez." />
            ) : (
              recurring.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setEditingRecurring(r)}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card dark:bg-surface-dark-subtle"
                >
                  <span className="text-xl">🔁</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.description}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {PERIODICITY_LABEL[r.periodicity]} · día {r.dayOfMonth}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatCurrency(r.amount, r.currency)}</span>
                </button>
              ))
            )}
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
