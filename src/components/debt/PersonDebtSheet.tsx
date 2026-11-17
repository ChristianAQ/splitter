import { useEffect, useState } from "react";
import { Check, ChevronRight, Plus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePartialPayment } from "../../hooks/usePartialPayment";
import { usePaymentEditor } from "../../hooks/usePaymentEditor";
import { PaymentList, type ListedPayment } from "./PaymentList";
import { setDebtsProgress } from "../../services/debts.service";
import { dueLabel, dueState, maxForPayment, paymentsOf, remainingAmount, removePayment, updatePayment } from "../../domain/debts";
import { payTowards, settleAllWith, type DebtUpdate, type PersonBalance } from "../../domain/debtPeople";
import { todayISO } from "../../domain/date";
import { formatCurrency, formatDate } from "../../lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  person?: PersonBalance;
  avatar: { color: string; photoUrl?: string };
  /** Open one of the entries on its own (to see or edit it). */
  onOpenDebt: (debtId: string) => void;
  /** Add another entry with this person. */
  onAdd: () => void;
}

/**
 * Everything open with one person, as a single account: the net figure —
 * who pays whom, and how much — the entries that make it up, and one
 * payment that settles the lot (or part of it).
 */
export function PersonDebtSheet({ open, onClose, person, avatar, onOpenDebt, onAdd }: Props) {
  const { user } = useAuth();
  const { show } = useToast();
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  const iPay = (person?.net ?? 0) < 0;
  const amount = Math.abs(person?.net ?? 0);

  const pay = usePartialPayment({
    remaining: amount,
    currency: person?.currency ?? "EUR",
    question: iPay ? `¿Cuánto le devuelves a ${person?.name}?` : `¿Cuánto te ha devuelto ${person?.name}?`,
    verb: iPay ? "Devolver" : "Cobrar",
    busy,
    onBack: () => setPaying(false),
    onConfirm: (value, coversAll) => {
      if (person) void run(payTowards(person, value, today, Date.now()), coversAll ? "Cuenta saldada" : iPay ? "Devolución registrada" : "Cobro registrado", coversAll);
    },
  });

  // Correcting one payment touches just the entry it belongs to.
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const editingDebt = person?.debts.find((d) => d.id === editingDebtId);
  const editor = usePaymentEditor({
    currency: person?.currency ?? "EUR",
    busy,
    onBack: () => editor.close(),
    maxFor: (payment) => (editingDebt ? maxForPayment(editingDebt, payment.at) : 0),
    onSave: (payment, value) => {
      if (editingDebt) void run([{ debt: editingDebt, progress: updatePayment(editingDebt, payment.at, value) }], "Pago corregido", false);
    },
    onDelete: (payment) => {
      if (editingDebt) void run([{ debt: editingDebt, progress: removePayment(editingDebt, payment.at) }], "Pago quitado", false);
    },
  });

  useEffect(() => {
    if (open) {
      setPaying(false);
      pay.reset();
      editor.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person?.key]);

  async function run(updates: DebtUpdate[], message: string, closeAfter: boolean) {
    if (!user || updates.length === 0) return;
    setBusy(true);
    try {
      await setDebtsProgress(user.uid, updates);
      show(message, "success");
      setPaying(false);
      pay.reset();
      editor.close();
      if (closeAfter) onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo guardar.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!person) return <BottomSheet open={false} onClose={onClose} children={null} />;

  if (editor.payment) {
    return (
      <BottomSheet open={open} onClose={onClose} title={editor.title} footer={editor.footer}>
        {editor.children}
      </BottomSheet>
    );
  }

  if (paying) {
    return (
      <BottomSheet open={open} onClose={onClose} title={pay.title} footer={pay.footer}>
        {pay.children}
      </BottomSheet>
    );
  }

  const money = (value: number) => formatCurrency(value, person.currency);
  const even = amount < 0.005;
  const bothWays = person.iOwe > 0 && person.owedToMe > 0;
  // Progress on the side that's paying: how much of what was owed that
  // way has already changed hands.
  const paidSoFar = iPay ? person.repaid : person.collected;
  const paidOf = iPay ? person.repaidOf : person.collectedOf;
  const payments: ListedPayment[] = person.debts.flatMap((d) =>
    paymentsOf(d).map((payment) => ({
      key: `${d.id}:${payment.at}`,
      payment,
      context: d.concept || (d.kind === "owe" ? "Te prestó dinero" : "Le prestaste dinero"),
      sign: bothWays ? (d.kind === "owe" ? "−" : "+") : undefined,
    }))
  );
  const settleAll = () => run(settleAllWith(person, today, Date.now()), "Cuenta saldada", true);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={person.name}
      footer={
        even ? (
          <Button className="w-full" onClick={settleAll} loading={busy}>
            <Check size={17} strokeWidth={2.6} />
            Dar la cuenta por saldada
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" className="shrink-0" onClick={() => setPaying(true)} disabled={busy}>
              Una parte
            </Button>
            <Button className="min-w-0 flex-1 whitespace-nowrap" onClick={settleAll} loading={busy}>
              <Check size={17} strokeWidth={2.6} />
              {iPay ? "Devolver" : "Cobrar"} {money(amount)}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex flex-col items-center pt-2 text-center">
          <Avatar name={person.name} color={avatar.color} photoUrl={avatar.photoUrl} size="lg" />
          <p className="mt-3 text-[13px] text-neutral-500 dark:text-neutral-400">
            {even ? "Estáis en paz" : iPay ? `Le debes a ${person.name}` : `${person.name} te debe`}
          </p>
          <p
            className={`mt-1 text-[40px] font-semibold leading-none tracking-[-0.04em] ${
              even ? "text-neutral-400 dark:text-neutral-500" : iPay ? "text-negative dark:text-negative-dark" : "text-positive dark:text-positive-dark"
            }`}
          >
            {money(amount)}
          </p>
          {/* The sum, shown only when there's something to net. */}
          {bothWays && (
            <p className="mt-2.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              Le debes {money(person.iOwe)} y te debe {money(person.owedToMe)}
            </p>
          )}
        </div>

        {!even && paidSoFar > 0 && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.min(paidSoFar / paidOf, 1) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[13px] text-neutral-500 dark:text-neutral-400">
              <span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-50">{money(paidSoFar)}</span> {iPay ? "devuelto" : "cobrado"}
              </span>
              <span>de {money(paidOf)}</span>
            </div>
          </div>
        )}

        <div>
          <h4 className="eyebrow mb-2 px-1">
            {person.debts.length} apunte{person.debts.length === 1 ? "" : "s"}
          </h4>
          <ul className="well divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
            {person.debts.map((d) => {
              const mine = d.kind === "owe";
              const state = dueState(d, today);
              const due = d.dueDate ? dueLabel(d, today) ?? `Vence el ${formatDate(d.dueDate)}` : null;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDebt(d.id)}
                    className="well-press flex w-full items-center gap-3 px-4 py-3 text-left first:rounded-t-[22px] last:rounded-b-[22px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.concept || (mine ? "Te prestó dinero" : "Le prestaste dinero")}</span>
                      <span className={`block text-xs ${state === "overdue" ? "font-medium text-negative dark:text-negative-dark" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {due ?? formatDate(d.date)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {mine ? "−" : "+"}
                      {money(remainingAmount(d))}
                    </span>
                    <ChevronRight size={15} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={onAdd} className="pressable mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-accent dark:text-accent-300">
            <Plus size={15} strokeWidth={2.5} />
            Añadir otro apunte con {person.name}
          </button>
        </div>

        <PaymentList
          title="Pagos hechos"
          currency={person.currency}
          items={payments}
          onEdit={(item) => {
            setEditingDebtId(item.key.split(":")[0]);
            editor.open(item.payment);
          }}
        />
      </div>
    </BottomSheet>
  );
}
