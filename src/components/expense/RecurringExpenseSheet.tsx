import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { CategoryPicker } from "./CategoryPicker";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { todayISO } from "../../domain/date";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  updateRecurringExpense,
} from "../../services/recurringExpenses.service";
import type { RecurringExpense, RecurringPeriodicity } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  recurring?: RecurringExpense;
}

const PERIODICITY_LABEL: Record<RecurringPeriodicity, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export function RecurringExpenseSheet({ open, onClose, recurring }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("suscripciones");
  const [periodicity, setPeriodicity] = useState<RecurringPeriodicity>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (recurring) {
      setAmount(String(recurring.amount));
      setDescription(recurring.description);
      setCategory(recurring.categoryId);
      setPeriodicity(recurring.periodicity);
      setDayOfMonth(recurring.dayOfMonth);
      setStartDate(recurring.startDate);
      setEndDate(recurring.endDate ?? "");
    } else {
      setAmount("");
      setDescription("");
      setCategory("suscripciones");
      setPeriodicity("monthly");
      setDayOfMonth(Number(todayISO().slice(8, 10)));
      setStartDate(todayISO());
      setEndDate("");
    }
  }, [open, recurring]);

  const amountValue = parseFloat(amount);
  const valid = amountValue > 0 && description.trim().length > 0;

  async function handleSave() {
    if (!user || !profile || !valid) return;
    setSaving(true);
    try {
      const input = {
        amount: amountValue,
        currency: profile.currency,
        description: description.trim(),
        categoryId: category,
        dayOfMonth,
        periodicity,
        startDate,
        endDate: endDate || undefined,
        active: true,
      };
      if (recurring) {
        await updateRecurringExpense(user.uid, recurring.id, input);
        show("Gasto recurrente actualizado", "success");
      } else {
        await createRecurringExpense(user.uid, input);
        show("Gasto recurrente creado", "success");
      }
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !recurring) return;
    setDeleting(true);
    try {
      await deleteRecurringExpense(user.uid, recurring.id);
      show("Gasto recurrente eliminado", "success");
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={recurring ? "Editar recurrente" : "Nuevo gasto recurrente"}>
      <div className="flex flex-col gap-5 pb-2 pt-1">
        <AmountInput value={amount} onChange={setAmount} currency={profile?.currency} autoFocus large />
        <Input
          label="Descripción"
          placeholder="Ej. Netflix, Alquiler, Gimnasio"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Categoría</p>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Periodicidad</p>
          <div className="flex gap-2">
            {(Object.keys(PERIODICITY_LABEL) as RecurringPeriodicity[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodicity(p)}
                className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
                  periodicity === p
                    ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                    : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                {PERIODICITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {periodicity === "monthly" && (
          <Input
            label="Día del mes"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
          />
        )}

        <Input label="Fecha de inicio" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input
          label="Fecha de finalización (opcional)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <div className="flex gap-3">
          {recurring && (
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
