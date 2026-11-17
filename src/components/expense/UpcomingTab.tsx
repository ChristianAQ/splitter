import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { UpcomingExpenseCard } from "./UpcomingExpenseCard";
import { ExpenseDetailSheet } from "./ExpenseDetailSheet";
import { PersonalExpenseSheet } from "./PersonalExpenseSheet";
import { CardListSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  deletePersonalExpense,
  payPartOfExpense,
  restorePersonalExpense,
  settleExpense,
} from "../../services/personalExpenses.service";
import { groupUpcoming, partsByParent, progressOf, type DueBucket } from "../../domain/installments";
import { toMinorUnits } from "../../domain/money";
import { todayISO } from "../../domain/date";
import { formatCurrency } from "../../lib/format";
import type { PersonalExpense } from "../../types";

interface Props {
  /** Every personal expense — the paid ones too, since the parts already
   * paid towards an upcoming one are among them. */
  expenses: PersonalExpense[];
  loading: boolean;
}

const BUCKET_TITLE: Record<DueBucket, string> = {
  overdue: "Vencidos",
  soon: "Esta semana",
  later: "Más adelante",
  undated: "Sin fecha",
};

/**
 * "Próximos": everything still to be paid, grouped by how soon — overdue,
 * this week, later, and the ones with no deadline. Each can be paid in one
 * go (the round check, or from its detail) or a part at a time.
 */
export function UpcomingTab({ expenses, loading }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [viewingId, setViewingId] = useState<string | null>(null);
  // undefined = form closed, null = new, an expense = editing it.
  const [editing, setEditing] = useState<PersonalExpense | null | undefined>(undefined);
  const today = todayISO();
  const currency = profile?.currency ?? "EUR";

  const { upcoming, parts, groups, total, overdueCount } = useMemo(() => {
    const upcoming = expenses.filter((e) => e.status === "future");
    const parts = partsByParent(expenses);
    const groups = groupUpcoming(upcoming, today);
    let totalMinor = 0;
    for (const e of upcoming) if (e.currency === currency) totalMinor += toMinorUnits(progressOf(e, parts).remaining, currency);
    return { upcoming, parts, groups, total: totalMinor / 100, overdueCount: groups.find((g) => g.bucket === "overdue")?.items.length ?? 0 };
  }, [expenses, today, currency]);

  const viewing = viewingId ? upcoming.find((e) => e.id === viewingId) : undefined;

  function fail(err: unknown, fallback: string): never {
    show(err instanceof Error ? err.message : fallback, "error");
    throw err;
  }

  async function payAll(expense: PersonalExpense) {
    if (!user) return;
    const progress = progressOf(expense, parts);
    try {
      await settleExpense(user.uid, expense, progress.remaining, progress.parts.length > 0, today);
      show("Pagado · ya cuenta en tus gastos", "success");
    } catch (err) {
      fail(err, "No se pudo marcar como pagado.");
    }
  }

  async function payPart(expense: PersonalExpense, amount: number) {
    if (!user) return;
    try {
      await payPartOfExpense(user.uid, expense, amount, today);
      show("Pago registrado", "success");
    } catch (err) {
      fail(err, "No se pudo registrar el pago.");
    }
  }

  async function handleDelete(expense: PersonalExpense) {
    if (!user) return;
    const uid = user.uid;
    const hadParts = (parts.get(expense.id)?.length ?? 0) > 0;
    try {
      await deletePersonalExpense(uid, expense.id);
      show(hadParts ? "Eliminado · lo ya pagado se queda en tus gastos" : "Eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restorePersonalExpense(uid, expense).catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      fail(err, "No se pudo eliminar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <CardListSkeleton count={2} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nada por pagar"
          description="Apunta aquí lo que tienes que pagar más adelante, con fecha o sin ella. Puedes pagarlo de una vez o por partes."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} strokeWidth={2.5} />
              Apuntar un pago
            </Button>
          }
        />
      ) : (
        <>
          <div className="surface flex items-center gap-4 rounded-[26px] p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Por pagar</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(total, currency)}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {upcoming.length} pago{upcoming.length === 1 ? "" : "s"}
                {overdueCount > 0 && (
                  <span className="font-semibold text-negative dark:text-negative-dark">
                    {" "}
                    · {overdueCount} vencido{overdueCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} strokeWidth={2.5} />
              Apuntar
            </Button>
          </div>

          {groups.map(({ bucket, items }) => (
            <section key={bucket}>
              <h2 className={`eyebrow mb-2 px-1 ${bucket === "overdue" ? "!text-negative dark:!text-negative-dark" : ""}`}>
                {BUCKET_TITLE[bucket]} · {items.length}
              </h2>
              <div className="stagger flex flex-col gap-2.5">
                {items.map((e) => (
                  <UpcomingExpenseCard
                    key={e.id}
                    expense={e}
                    progress={progressOf(e, parts)}
                    today={today}
                    onClick={() => setViewingId(e.id)}
                    onPayAll={() => void payAll(e).catch(() => {})}
                    onDelete={() => handleDelete(e)}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <ExpenseDetailSheet
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        expense={viewing}
        progress={viewing ? progressOf(viewing, parts) : undefined}
        onPayPart={(amount) => (viewing ? payPart(viewing, amount) : Promise.resolve())}
        onPayAll={() => (viewing ? payAll(viewing) : Promise.resolve())}
        onOpenPart={(part) => {
          setEditing(part);
          setViewingId(null);
        }}
        onEdit={() => {
          if (viewing) setEditing(viewing);
          setViewingId(null);
        }}
      />
      <PersonalExpenseSheet
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        expense={editing ?? undefined}
        startUpcoming
        paidSoFar={editing && editing.status === "future" ? progressOf(editing, parts).paid : 0}
      />
    </div>
  );
}
