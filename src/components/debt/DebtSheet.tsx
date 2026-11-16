import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { ConfirmDialog } from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFriends } from "../../hooks/useFriends";
import { createDebt, deleteDebt, setDebtProgress, updateDebt } from "../../services/debts.service";
import { applyRepayment, isSettled, remainingAmount } from "../../domain/debts";
import { addDays, addMonthsClamped, daysInMonth, formatISO, parseISO, todayISO } from "../../domain/date";
import { DEBT_KIND_OPTIONS } from "../../lib/debts";
import { formatCurrency } from "../../lib/format";
import type { Debt, DebtKind } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  debt?: Debt;
  initialKind?: DebtKind;
}

const COPY: Record<DebtKind, { person: string; concept: string; conceptPlaceholder: string; due: string }> = {
  owe: {
    person: "¿A quién se lo debes?",
    concept: "Concepto (opcional)",
    conceptPlaceholder: "Ej. Me adelantó el alquiler",
    due: "¿Cuándo lo devuelves?",
  },
  owed: {
    person: "¿Quién te lo debe?",
    concept: "Concepto (opcional)",
    conceptPlaceholder: "Ej. Entradas del concierto",
    due: "¿Cuándo te lo devuelve?",
  },
  reminder: {
    person: "",
    concept: "¿Qué tienes que pagar?",
    conceptPlaceholder: "Ej. Fianza del piso",
    due: "¿Para cuándo?",
  },
};

function duePresets(today: string): { label: string; value: string }[] {
  const now = parseISO(today);
  const endOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), daysInMonth(now.getUTCFullYear(), now.getUTCMonth()))
  );
  return [
    { label: "Cuando se pueda", value: "" },
    { label: "En una semana", value: formatISO(addDays(now, 7)) },
    { label: "Fin de mes", value: formatISO(endOfMonth) },
    { label: "El mes que viene", value: formatISO(addMonthsClamped(now, 1, now.getUTCDate())) },
  ];
}

export function DebtSheet({ open, onClose, debt, initialKind = "owe" }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { friends } = useFriends();
  const [kind, setKind] = useState<DebtKind>(initialKind);
  const [amount, setAmount] = useState("");
  const [person, setPerson] = useState("");
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [repayment, setRepayment] = useState("");
  const [busy, setBusy] = useState<null | "save" | "progress" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keyed on the id (not the object): the live subscription hands back a
  // fresh `debt` object after every repayment, and resetting on that would
  // wipe whatever else is being edited in the form at the time.
  const debtId = debt?.id;
  useEffect(() => {
    if (!open) return;
    setRepayment("");
    setConfirmDelete(false);
    if (debt) {
      setKind(debt.kind);
      setAmount(String(debt.amount));
      setPerson(debt.person ?? "");
      setConcept(debt.concept ?? "");
      setDate(debt.date);
      setDueDate(debt.dueDate ?? "");
      setNotes(debt.notes ?? "");
    } else {
      setKind(initialKind);
      setAmount("");
      setPerson("");
      setConcept("");
      setDate(todayISO());
      setDueDate("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debtId, initialKind]);

  const copy = COPY[kind];
  const currency = debt?.currency ?? profile?.currency ?? "EUR";
  const amountValue = parseFloat(amount);
  const alreadyPaid = debt && !isSettled(debt) ? debt.paidAmount : 0;
  const belowPaid = amountValue > 0 && amountValue < alreadyPaid;
  const valid =
    amountValue > 0 &&
    !belowPaid &&
    date.length === 10 &&
    (kind === "reminder" ? concept.trim().length > 0 : person.trim().length > 0);

  const suggestions =
    kind !== "reminder" && !debt
      ? friends.filter((f) => f.name.toLowerCase() !== person.trim().toLowerCase()).slice(0, 6)
      : [];

  function fail(err: unknown, fallback: string) {
    show(err instanceof Error ? err.message : fallback, "error");
  }

  async function handleSave() {
    if (!user || !valid) return;
    setBusy("save");
    const input = {
      kind,
      person: kind === "reminder" ? undefined : person.trim(),
      concept: concept.trim() || undefined,
      amount: amountValue,
      currency,
      date,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (debt) await updateDebt(user.uid, debt.id, input);
      else await createDebt(user.uid, input);
      show(debt ? "Cambios guardados" : "Apuntado", "success");
      onClose();
    } catch (err) {
      fail(err, "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRepayment() {
    if (!user || !debt) return;
    const value = parseFloat(repayment);
    if (!(value > 0)) return;
    setBusy("progress");
    try {
      const next = applyRepayment(debt, value);
      await setDebtProgress(user.uid, debt.id, next.paidAmount, next.settles);
      setRepayment("");
      if (next.settles) {
        show("Saldado del todo", "success");
        onClose();
      } else {
        show("Devolución apuntada", "success");
      }
    } catch (err) {
      fail(err, "No se pudo apuntar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleSettled() {
    if (!user || !debt) return;
    setBusy("progress");
    try {
      if (isSettled(debt)) {
        // Reopening one that was paid back in full would otherwise come
        // back with nothing left to pay.
        await setDebtProgress(user.uid, debt.id, debt.paidAmount >= debt.amount ? 0 : debt.paidAmount, false);
        show("Vuelve a estar pendiente", "success");
      } else {
        await setDebtProgress(user.uid, debt.id, debt.paidAmount, true);
        show("Saldado", "success");
      }
      onClose();
    } catch (err) {
      fail(err, "No se pudo actualizar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!user || !debt) return;
    setBusy("delete");
    try {
      await deleteDebt(user.uid, debt.id);
      show("Eliminado", "success");
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      fail(err, "No se pudo eliminar.");
    } finally {
      setBusy(null);
    }
  }

  const settled = debt ? isSettled(debt) : false;
  const remaining = debt ? remainingAmount(debt) : 0;

  return (
    <>
      <BottomSheet
      open={open}
      onClose={onClose}
      title={debt ? "Editar" : "Apuntar"}
      footer={
        <div className="flex gap-3">
          {debt && (
            <Button variant="ghost" className="!text-negative" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
              Eliminar
            </Button>
          )}
          <Button onClick={handleSave} loading={busy === "save"} disabled={!valid || (busy !== null && busy !== "save")} className="flex-1">
            Guardar
          </Button>
        </div>
      }
    >
        <div className="flex flex-col gap-5 pb-2 pt-1">
          <Segmented options={DEBT_KIND_OPTIONS} value={kind} onChange={setKind} label="Tipo" />

          <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus={!debt} large />
          {belowPaid && (
            <p className="-mt-3 text-center text-xs text-negative">
              Ya hay {formatCurrency(alreadyPaid, currency)} devueltos; el importe no puede ser menor.
            </p>
          )}

          {kind !== "reminder" && (
            <div className="flex flex-col gap-2">
              <Input label={copy.person} placeholder="Nombre" value={person} onChange={(e) => setPerson(e.target.value)} />
              {suggestions.length > 0 && (
                <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
                  {suggestions.map((f) => (
                    <button
                      key={f.uid}
                      type="button"
                      onClick={() => setPerson(f.name)}
                      className="well well-press shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Input label={copy.concept} placeholder={copy.conceptPlaceholder} value={concept} onChange={(e) => setConcept(e.target.value)} />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{copy.due}</p>
            <div className="flex flex-wrap gap-1.5">
              {duePresets(todayISO()).map((p) => {
                const selected = dueDate === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDueDate(p.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected ? "bg-accent text-white" : "well well-press text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <Input
              type="date"
              aria-label="Fecha límite"
              placeholder="O elige un día concreto"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Input
            label={kind === "reminder" ? "Apuntado el" : "Fecha del préstamo"}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {debt && (
            <div className="well flex flex-col gap-3 rounded-[22px] p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{settled ? "Saldado" : "Queda por devolver"}</p>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(settled ? 0 : remaining, currency)}</p>
              </div>
              {!settled && (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden>
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.min(debt.paidAmount / debt.amount, 1) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        label="Apuntar una devolución parcial"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={repayment}
                        onChange={(e) => {
                          const v = e.target.value.replace(",", ".");
                          if (/^\d*\.?\d{0,2}$/.test(v)) setRepayment(v);
                        }}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      className="h-12"
                      onClick={handleRepayment}
                      loading={busy === "progress"}
                      disabled={!(parseFloat(repayment) > 0) || busy !== null}
                    >
                      Apuntar
                    </Button>
                  </div>
                </>
              )}
              <Button variant={settled ? "secondary" : "primary"} onClick={handleToggleSettled} disabled={busy !== null}>
                {settled ? "Volver a marcar como pendiente" : "Marcar como saldado"}
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este apunte?"
        description="Se borrará junto con las devoluciones que tuviera apuntadas."
        confirmLabel="Eliminar"
        destructive
        busy={busy === "delete"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
