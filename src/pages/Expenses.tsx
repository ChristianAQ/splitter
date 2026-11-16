import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, Wallet } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { PersonalExpenseCard } from "../components/expense/ExpenseCard";
import { PersonalExpenseSheet } from "../components/expense/PersonalExpenseSheet";
import { ExpenseDetailSheet } from "../components/expense/ExpenseDetailSheet";
import { UpcomingTab } from "../components/expense/UpcomingTab";
import { RecurringTab } from "../components/expense/RecurringTab";
import { DebtsTab } from "../components/debt/DebtsTab";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { Collapsible } from "../components/ui/Collapsible";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { deletePersonalExpense, restorePersonalExpense } from "../services/personalExpenses.service";
import { formatCurrency, formatMonth } from "../lib/format";
import { todayISO } from "../domain/date";
import type { PersonalExpense } from "../types";

type Tab = "pasados" | "proximos" | "recurrentes" | "deudas";

const TAB_OPTIONS: [Tab, string][] = [
  ["pasados", "Hechos"],
  ["proximos", "Próximos"],
  ["recurrentes", "Fijos"],
  ["deudas", "Deudas"],
];
const TABS = TAB_OPTIONS.map(([key]) => key);

/**
 * Gastos: what's been spent (Hechos), what's still to be paid (Próximos),
 * what repeats every month (Fijos), and money lent or borrowed (Deudas).
 * Each of the last three is its own component; this page owns the tab
 * switcher and the list of paid expenses.
 */
export function Expenses() {
  const { user } = useAuth();
  const { show } = useToast();
  const { expenses, loading } = usePersonalExpenses();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "pasados");
  // Tapping a row opens it read-only (by id, looked up live); the edit form
  // is only reached from there.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PersonalExpense | null>(null);
  const currentMonth = todayISO().slice(0, 7);

  const past = useMemo(
    () => expenses.filter((e) => e.status !== "future").sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [expenses]
  );
  const viewing = viewingId ? past.find((e) => e.id === viewingId) : undefined;

  async function handleDelete(expense: PersonalExpense) {
    if (!user) return;
    const uid = user.uid;
    try {
      await deletePersonalExpense(uid, expense.id);
      show("Gasto eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restorePersonalExpense(uid, expense).catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
      throw err; // lets the row slide back into place
    }
  }

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
        <Segmented options={TAB_OPTIONS} value={tab} onChange={setTab} className="mb-5" label="Secciones de gastos" />

        {tab === "pasados" &&
          (loading ? (
            <CardListSkeleton />
          ) : past.length === 0 ? (
            <EmptyState icon={Wallet} title="Aún no tienes gastos" description="Añade tu primer gasto con el botón +." />
          ) : (
            <MonthlyList expenses={past} onSelect={(e) => setViewingId(e.id)} onDelete={handleDelete} currentMonth={currentMonth} />
          ))}

        {tab === "proximos" && <UpcomingTab expenses={expenses} loading={loading} />}
        {tab === "recurrentes" && <RecurringTab />}
        {tab === "deudas" && <DebtsTab />}
      </PageContainer>

      <ExpenseDetailSheet
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        expense={viewing}
        onEdit={() => {
          if (viewing) setEditing(viewing);
          setViewingId(null);
        }}
      />
      <PersonalExpenseSheet open={Boolean(editing)} onClose={() => setEditing(null)} expense={editing ?? undefined} />
    </>
  );
}

function MonthlyList({
  expenses,
  onSelect,
  onDelete,
  currentMonth,
}: {
  expenses: PersonalExpense[];
  onSelect: (e: PersonalExpense) => void;
  onDelete: (e: PersonalExpense) => Promise<void>;
  currentMonth: string;
}) {
  const groups = useMemo(() => {
    const list: { month: string; items: PersonalExpense[]; total: number }[] = [];
    for (const e of expenses) {
      const month = e.date.slice(0, 7);
      const last = list[list.length - 1];
      if (last?.month === month) {
        last.items.push(e);
        last.total += e.amount;
      } else {
        list.push({ month, items: [e], total: e.amount });
      }
    }
    return list;
  }, [expenses]);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ month, items, total }) => (
        <Collapsible
          key={month}
          defaultOpen={month === currentMonth}
          title={formatMonth(items[0].date)}
          headerRight={
            <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
              {formatCurrency(total, items[0].currency)}
            </span>
          }
        >
          <div className="stagger flex flex-col gap-2.5 pb-1">
            {items.map((e) => (
              <PersonalExpenseCard key={e.id} expense={e} onClick={() => onSelect(e)} onDelete={() => onDelete(e)} />
            ))}
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
