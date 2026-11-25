import { useMemo, useState } from "react";
import { Check, Plus, Repeat } from "lucide-react";
import { RecurringBudgetCard } from "./RecurringBudgetCard";
import { FixedOverviewCard } from "./FixedOverviewCard";
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
import { haptic } from "../../lib/haptics";
import { commitmentOf } from "../../domain/commitments";
import { NO_BANK_COLOR, bankById } from "../../lib/banks";
import { chargeDateInMonth, nextOccurrence } from "../../domain/recurring";
import { formatCurrency } from "../../lib/format";
import type { Bank, RecurringExpense } from "../../types";

const PERIODICITY_LABEL: Record<RecurringExpense["periodicity"], string> = { weekly: "Semanal", monthly: "Mensual", yearly: "Anual" };
const SHORT_MONTH = new Intl.DateTimeFormat("es-ES", { month: "short" });

function SectionHeader({ title, count, total }: { title: string; count: number; total: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h3 className="eyebrow">
        {title} · {count}
      </h3>
      <span className="text-[13px] font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">{total}</span>
    </div>
  );
}

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
    haptic();
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

  const today = todayISO();
  const rows = visible.map((r) => {
    const thisMonthDate = chargeDateInMonth(r, month);
    return { r, done: r.lastCompletedMonth === month, dueNow: r.active && thisMonthDate !== null, date: thisMonthDate ?? nextOccurrence(r, today) };
  });
  const byDate = (a: (typeof rows)[number], b: (typeof rows)[number]) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.r.description.localeCompare(b.r.description);
  const pendingRows = rows.filter((x) => !x.done && x.dueNow).sort(byDate);
  const paidRows = rows.filter((x) => x.done).sort(byDate);
  // Yearly ones charging in another month, plans not started yet or over.
  const laterRows = rows.filter((x) => !x.done && !x.dueNow).sort(byDate);
  const sum = (list: typeof rows) => list.reduce((total, x) => total + x.r.amount, 0);

  const renderRow = ({ r, done, date }: (typeof rows)[number]) => {
    const bank = bankById(banks, r.bankId);
    const day = date ? Number(date.slice(8)) : null;
    const late = !done && date !== null && date < today && date.slice(0, 7) === month;
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
            className={`hit-slop pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
              done ? "border-positive bg-positive text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"
            }`}
          >
            <Check size={14} strokeWidth={3} />
          </button>
        }
      >
        <button type="button" onClick={() => setViewingId(r.id)} className="surface pressable flex w-full items-center gap-3 rounded-[20px] py-3 pl-3 pr-3.5 text-left">
          {/* The charge date as a small calendar leaf, edged in the bank's color. */}
          <span
            className={`relative flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-[13px] leading-none ${done ? "well opacity-60" : "well"}`}
            aria-hidden
          >
            <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: bank?.color ?? NO_BANK_COLOR }} />
            {date ? (
              <>
                <span className="text-[16px] font-semibold tabular-nums">{day}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {SHORT_MONTH.format(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1)).replace(".", "")}
                </span>
              </>
            ) : (
              <Repeat size={16} strokeWidth={2} className="text-neutral-400" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[15px] font-semibold ${done ? "text-neutral-500 dark:text-neutral-400" : ""}`}>{r.description}</span>
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
              {bank && <span className="font-medium text-neutral-600 dark:text-neutral-300">{bank.name} · </span>}
              {r.endDate ? <PaymentsLeft recurring={r} /> : late ? "Sin marcar" : PERIODICITY_LABEL[r.periodicity]}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className={`block text-[15px] font-semibold tabular-nums ${done ? "text-neutral-500 line-through decoration-neutral-400/60 dark:text-neutral-400" : ""}`}>
              −{formatCurrency(r.amount, r.currency)}
            </span>
            {done && <span className="block text-[11px] font-medium text-positive dark:text-positive-dark">Pagado</span>}
          </span>
        </button>
      </SwipeToDelete>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {recurring.length > 0 && <FixedOverviewCard recurring={recurring} month={month} today={today} currency={currency} />}
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

      {recurring.length > 0 && (
        <div className="mt-2 flex items-center justify-between px-1">
          <h2 className="text-[17px] font-semibold tracking-tight">
            {filter === undefined ? "Cargos" : filter === null ? "Sin banco" : bankById(banks, filter)?.name}
            {filter !== undefined && (
              <button type="button" onClick={() => setBankFilter(undefined)} className="ml-2 text-[13px] font-semibold text-accent dark:text-accent-300">
                Ver todos
              </button>
            )}
          </h2>
          <button
            onClick={() => setEditing(null)}
            className="pressable flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-[13px] font-semibold text-accent dark:bg-accent/20 dark:text-accent-300"
          >
            <Plus size={15} strokeWidth={2.6} />
            Nuevo
          </button>
        </div>
      )}

      {loading ? (
        <CardListSkeleton count={2} />
      ) : recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Sin gastos fijos"
          description="Alquiler, Netflix, el gimnasio o una compra a plazos: configúralos una vez y márcalos cada mes."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} strokeWidth={2.5} />
              Nuevo gasto fijo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5" key={String(filter)}>
          {pendingRows.length > 0 && (
            <section>
              <SectionHeader title="Pendientes este mes" count={pendingRows.length} total={formatCurrency(sum(pendingRows), currency)} />
              <div className="stagger flex flex-col gap-2">{pendingRows.map(renderRow)}</div>
            </section>
          )}
          {paidRows.length > 0 && (
            <section>
              <SectionHeader title="Pagados" count={paidRows.length} total={formatCurrency(sum(paidRows), currency)} />
              <div className="stagger flex flex-col gap-2">{paidRows.map(renderRow)}</div>
            </section>
          )}
          {laterRows.length > 0 && (
            <section>
              <SectionHeader title="Otros meses" count={laterRows.length} total="" />
              <div className="stagger flex flex-col gap-2">{laterRows.map(renderRow)}</div>
            </section>
          )}
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

/** "Plazo 6 de 9" on a fixed expense with an end date: the payment this
 * month's charge is (or the next one, once it's been ticked off). */
function PaymentsLeft({ recurring }: { recurring: RecurringExpense }) {
  const c = commitmentOf(recurring, todayISO());
  if (c.remainingPayments === 0) return <span className="font-medium text-positive dark:text-positive-dark">Terminado</span>;
  const current = recurring.lastCompletedMonth === todayISO().slice(0, 7) ? c.paidPayments : c.paidPayments + 1;
  return (
    <span className="font-medium text-accent-700 dark:text-accent-300">
      Plazo {current} de {c.totalPayments}
    </span>
  );
}
