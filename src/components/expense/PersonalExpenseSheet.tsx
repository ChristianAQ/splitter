import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { CategoryPicker } from "./CategoryPicker";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createPersonalExpense, deletePersonalExpense, updatePersonalExpense } from "../../services/personalExpenses.service";
import { todayISO } from "../../domain/date";
import type { PersonalExpense } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: PersonalExpense;
}

export function PersonalExpenseSheet({ open, onClose, expense }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("otros");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setCategory(expense.categoryId);
      setDate(expense.date);
      setNotes(expense.notes ?? "");
    } else {
      setAmount("");
      setDescription("");
      setCategory("otros");
      setDate(todayISO());
      setNotes("");
    }
  }, [open, expense]);

  const amountValue = parseFloat(amount);
  const valid = amountValue > 0 && description.trim().length > 0 && date.length === 10;

  async function handleSave() {
    if (!user || !profile || !valid) return;
    setSaving(true);
    try {
      const status: PersonalExpense["status"] = date > todayISO() ? "future" : "done";
      if (expense) {
        await updatePersonalExpense(user.uid, expense.id, {
          amount: amountValue,
          currency: profile.currency,
          description: description.trim(),
          categoryId: category,
          date,
          status,
          notes: notes.trim() || undefined,
        });
        show("Gasto actualizado", "success");
      } else {
        await createPersonalExpense(user.uid, {
          amount: amountValue,
          currency: profile.currency,
          description: description.trim(),
          categoryId: category,
          date,
          status,
          notes: notes.trim() || undefined,
        });
        show("Gasto añadido", "success");
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
    <BottomSheet open={open} onClose={onClose} title={expense ? "Editar gasto" : "Nuevo gasto"}>
      <div className="flex flex-col gap-5 pb-2 pt-1">
        <AmountInput value={amount} onChange={setAmount} currency={profile?.currency} autoFocus large />
        <Input
          label="Descripción"
          placeholder="Ej. Compra semanal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Categoría</p>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {date > todayISO() && (
          <p className="-mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Se guardará como gasto próximo hasta que llegue la fecha.
          </p>
        )}
        <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex gap-3">
          {expense && (
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">
              Eliminar
            </Button>
          )}
          <Button onClick={handleSave} loading={saving} disabled={!valid} className="flex-1">
            Guardar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
