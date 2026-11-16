import { Check, Repeat } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { DetailHero, DetailRows, EditAction } from "../ui/Detail";
import { categoryById } from "../../lib/categories";
import { nextOccurrence } from "../../domain/recurring";
import { todayISO } from "../../domain/date";
import { formatCurrency, formatDateLong } from "../../lib/format";
import type { RecurringExpense } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  recurring?: RecurringExpense;
  doneThisMonth: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
}

const PERIODICITY: Record<RecurringExpense["periodicity"], string> = {
  weekly: "Cada semana",
  monthly: "Cada mes",
  yearly: "Cada año",
};

/** Read-only view of a recurring expense, with the one thing you do to it
 * month to month: tick it off as paid. */
export function RecurringDetailSheet({ open, onClose, recurring, doneThisMonth, onToggleDone, onEdit }: Props) {
  if (!recurring) return <BottomSheet open={false} onClose={onClose} children={null} />;

  const category = categoryById(recurring.categoryId);
  const next = nextOccurrence(recurring, todayISO());

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Gasto fijo"
      headerAction={<EditAction onClick={onEdit} />}
      footer={
        <Button variant={doneThisMonth ? "secondary" : "primary"} className="w-full" onClick={onToggleDone}>
          {!doneThisMonth && <Check size={17} strokeWidth={2.6} />}
          {doneThisMonth ? "Desmarcar el pago de este mes" : "Marcar como pagado este mes"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <DetailHero
          icon={Repeat}
          chipClassName="well text-neutral-600 dark:text-neutral-300"
          title={recurring.description}
          amount={formatCurrency(recurring.amount, recurring.currency)}
          caption={
            doneThisMonth ? (
              <span className="inline-flex items-center gap-1 font-semibold text-positive dark:text-positive-dark">
                <Check size={14} strokeWidth={2.8} />
                Pagado este mes
              </span>
            ) : (
              "Pendiente este mes"
            )
          }
        />
        <DetailRows
          rows={[
            { label: "Se repite", value: PERIODICITY[recurring.periodicity] },
            { label: "Próximo cargo", value: next ? formatDateLong(next) : null },
            { label: "Categoría", value: category.label },
            { label: "Desde", value: formatDateLong(recurring.startDate) },
            { label: "Hasta", value: recurring.endDate ? formatDateLong(recurring.endDate) : null },
            { label: "Notas", value: recurring.notes },
          ]}
        />
      </div>
    </BottomSheet>
  );
}
