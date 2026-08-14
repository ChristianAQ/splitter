import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { CategoryPicker } from "./CategoryPicker";
import { MemberSelector, PayerSelector } from "./MemberSelector";
import { SplitSelector } from "./SplitSelector";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { computeSplit } from "../../domain/split";
import { todayISO } from "../../domain/date";
import { createGroupExpense, deleteGroupExpense, updateGroupExpense } from "../../services/expenses.service";
import { logHistory } from "../../services/history.service";
import type { Currency, GroupExpense, GroupMember, SplitMethod } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  currency: Currency;
  members: GroupMember[];
  expense?: GroupExpense;
}

export function GroupExpenseSheet({ open, onClose, groupId, currency, members, expense }: Props) {
  const { user } = useAuth();
  const { show } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("otros");
  const [date, setDate] = useState(todayISO());
  const [payer, setPayer] = useState(user?.uid ?? "");
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setCategory(expense.categoryId);
      setDate(expense.date);
      setPayer(expense.paidBy);
      setParticipants(expense.participants);
      setSplitMethod(expense.splitMethod);
      setAmounts(Object.fromEntries(expense.splits.map((s) => [s.uid, String(s.amount)])));
      setNotes(expense.notes ?? "");
    } else {
      setAmount("");
      setDescription("");
      setCategory("otros");
      setDate(todayISO());
      setPayer(user?.uid ?? members[0]?.uid ?? "");
      setParticipants(members.filter((m) => m.active).map((m) => m.uid));
      setSplitMethod("equal");
      setAmounts({});
      setNotes("");
    }
    setError(null);
  }, [open, expense, user, members]);

  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);
  const selectedMembers = useMemo(() => activeMembers.filter((m) => participants.includes(m.uid)), [activeMembers, participants]);
  const amountValue = parseFloat(amount);
  const isCreator = !expense || expense.createdBy === user?.uid;

  function toggleParticipant(uid: string) {
    setParticipants((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }

  const basicsValid = amountValue > 0 && description.trim().length > 0 && payer && participants.length > 0;

  async function handleSave() {
    if (!user || !basicsValid) return;
    setError(null);

    const amountsMap = Object.fromEntries(participants.map((uid) => [uid, parseFloat(amounts[uid]) || 0]));
    const result = computeSplit(splitMethod, amountValue, currency, participants, amountsMap);
    if (!result.ok) {
      setError(result.error?.message ?? "Revisa el reparto.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        paidBy: payer,
        amount: amountValue,
        currency,
        description: description.trim(),
        categoryId: category,
        date,
        splitMethod,
        participants,
        splits: result.splits,
        notes: notes.trim() || undefined,
      };
      const actorName = members.find((m) => m.uid === user.uid)?.name ?? "Alguien";

      if (expense) {
        await updateGroupExpense(groupId, expense.id, input);
        await logHistory(groupId, "expense_edited", user.uid, actorName, `${actorName} editó "${description.trim()}"`, expense.id);
        show("Gasto actualizado", "success");
      } else {
        await createGroupExpense(groupId, user.uid, input);
        await logHistory(groupId, "expense_added", user.uid, actorName, `${actorName} añadió "${description.trim()}"`);
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
      await deleteGroupExpense(groupId, expense.id);
      const actorName = members.find((m) => m.uid === user.uid)?.name ?? "Alguien";
      await logHistory(groupId, "expense_deleted", user.uid, actorName, `${actorName} eliminó "${expense.description}"`, expense.id);
      show("Gasto eliminado", "success");
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={expense ? "Editar gasto" : "Nuevo gasto de grupo"}>
      <div className="flex flex-col gap-5 pb-2 pt-1">
        <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus={!expense} large />
        <Input
          label="Descripción"
          placeholder="Ej. Cena"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Categoría</p>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Pagó</p>
          <PayerSelector members={activeMembers} value={payer} onChange={setPayer} />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">¿Quién participa?</p>
          <MemberSelector members={activeMembers} selected={participants} onToggle={toggleParticipant} />
        </div>

        {selectedMembers.length > 0 && amountValue > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Reparto</p>
            <SplitSelector
              method={splitMethod}
              onMethodChange={setSplitMethod}
              totalAmount={amountValue}
              currency={currency}
              participants={selectedMembers}
              amounts={amounts}
              onAmountChange={(uid, raw) => setAmounts((prev) => ({ ...prev, [uid]: raw }))}
            />
          </div>
        )}

        <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="text-sm font-medium text-negative">{error}</p>}
        {!isCreator && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            🔒 Solo quien creó este gasto puede editarlo o eliminarlo.
          </p>
        )}

        {isCreator && (
          <div className="flex gap-3">
            {expense && (
              <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">
                Eliminar
              </Button>
            )}
            <Button onClick={handleSave} loading={saving} disabled={!basicsValid} className="flex-1">
              Guardar
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
