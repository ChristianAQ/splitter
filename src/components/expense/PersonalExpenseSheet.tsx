import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { DuePicker } from "../ui/DuePicker";
import { CategoryPicker } from "./CategoryPicker";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createPersonalExpense, deletePersonalExpense, updatePersonalExpense } from "../../services/personalExpenses.service";
import { todayISO } from "../../domain/date";
import { formatCurrency } from "../../lib/format";
import type { PersonalExpense } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: PersonalExpense;
  /** A new expense starts out as "still to pay" (opened from Próximos). */
  startUpcoming?: boolean;
  /** When editing an upcoming expense that has been paid in part: how much.
   * Its total can't drop below this, and it can't be flipped to "paid" from
   * here (paying off the rest is done from its detail view). */
  paidSoFar?: number;
}

type When = "paid" | "upcoming";

const WHEN_OPTIONS: [When, string][] = [
  ["paid", "Ya pagado"],
  ["upcoming", "Por pagar"],
];

export function PersonalExpenseSheet({ open, onClose, expense, startUpcoming = false, paidSoFar = 0 }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [when, setWhen] = useState<When>("paid");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("otros");
  const [date, setDate] = useState(todayISO()); // when it was paid
  const [dueDate, setDueDate] = useState(""); // when it's due; "" = no deadline
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      const upcoming = expense.status === "future";
      setWhen(upcoming ? "upcoming" : "paid");
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setCategory(expense.categoryId);
      setDate(upcoming ? todayISO() : expense.date);
      setDueDate(upcoming && !expense.undated ? expense.date : "");
      setNotes(expense.notes ?? "");
    } else {
      setWhen(startUpcoming ? "upcoming" : "paid");
      setAmount("");
      setDescription("");
      setCategory("otros");
      setDate(todayISO());
      setDueDate("");
      setNotes("");
    }
  }, [open, expense, startUpcoming]);

  const today = todayISO();
  const upcoming = when === "upcoming";
  const currency = expense?.currency ?? profile?.currency ?? "EUR";
  const amountValue = parseFloat(amount);
  const belowPaid = paidSoFar > 0 && amountValue > 0 && amountValue < paidSoFar;
  const valid = amountValue > 0 && !belowPaid && description.trim().length > 0 && (upcoming || date.length === 10);

  async function handleSave() {
    if (!user || !profile || !valid) return;
    setSaving(true);
    try {
      const input = {
        amount: amountValue,
        currency,
        description: description.trim(),
        categoryId: category,
        // An upcoming expense with no deadline still stores a date (when it
        // was noted down) so every expense sorts the same way.
        date: upcoming ? dueDate || (expense?.status === "future" ? expense.date : today) : date > today ? today : date,
        status: (upcoming ? "future" : "done") as PersonalExpense["status"],
        undated: upcoming && !dueDate,
        notes: notes.trim() || undefined,
      };
      if (expense) {
        await updatePersonalExpense(user.uid, expense.id, input);
        show("Cambios guardados", "success");
      } else {
        await createPersonalExpense(user.uid, { ...input, undated: input.undated || undefined });
        show(upcoming ? "Apuntado en Próximos" : "Gasto añadido", "success");
      }
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo guardar el gasto.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !expense) return;
    setDeleting(true);
    try {
      await deletePersonalExpense(user.uid, expense.id);
      show("Gasto eliminado", "success");
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={expense ? "Editar gasto" : "Nuevo gasto"}
      footer={
        <div className="flex gap-3">
          {expense && (
            <Button variant="ghost" className="!text-negative" onClick={handleDelete} loading={deleting}>
              Eliminar
            </Button>
          )}
          <Button onClick={handleSave} loading={saving} disabled={!valid} className="flex-1">
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-2 pt-1">
        {/* Paid already, or still to pay? Not offered once part of it has
         * been paid — at that point it is, by definition, still to pay. */}
        {paidSoFar === 0 && <Segmented options={WHEN_OPTIONS} value={when} onChange={setWhen} label="¿Ya está pagado?" />}

        <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus={!expense} large />
        {paidSoFar > 0 && (
          <p className={`-mt-3 text-center text-xs ${belowPaid ? "text-negative" : "text-neutral-500 dark:text-neutral-400"}`}>
            {belowPaid
              ? `Ya has pagado ${formatCurrency(paidSoFar, currency)}; el total no puede ser menor.`
              : `Importe total · ya has pagado ${formatCurrency(paidSoFar, currency)}`}
          </p>
        )}

        <Input
          label="Descripción"
          placeholder={upcoming ? "Ej. Dentista, fianza del piso" : "Ej. Compra semanal"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Categoría</p>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        {upcoming ? (
          <>
            <DuePicker label="¿Para cuándo?" value={dueDate} onChange={setDueDate} />
            <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Se queda en Próximos y no cuenta en tus gastos hasta que lo pagues, entero o por partes.
            </p>
          </>
        ) : (
          <Input label="Fecha" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        )}

        <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </BottomSheet>
  );
}
