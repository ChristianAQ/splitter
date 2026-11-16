import { Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { DetailHero, DetailRows, EditAction } from "../ui/Detail";
import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDateLong } from "../../lib/format";
import type { PersonalExpense } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: PersonalExpense;
  onEdit: () => void;
  /** Only offered for upcoming expenses. */
  onMarkDone: () => void;
}

/** Read-only view of a personal expense. Editing is a separate step, from
 * the header. */
export function ExpenseDetailSheet({ open, onClose, expense, onEdit, onMarkDone }: Props) {
  if (!expense) return <BottomSheet open={false} onClose={onClose} children={null} />;

  const category = categoryById(expense.categoryId);
  const upcoming = expense.status === "future";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={upcoming ? "Gasto próximo" : "Gasto"}
      headerAction={<EditAction onClick={onEdit} />}
      footer={
        upcoming ? (
          <Button className="w-full" onClick={onMarkDone}>
            <Check size={17} strokeWidth={2.6} />
            Marcar como pagado
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <DetailHero
          icon={category.icon}
          chipStyle={{ backgroundColor: `${category.color}22`, color: category.color }}
          title={expense.description}
          amount={formatCurrency(expense.amount, expense.currency)}
          caption={upcoming ? "Todavía no cuenta en tus gastos del mes" : undefined}
        />
        <DetailRows
          rows={[
            { label: "Fecha", value: formatDateLong(expense.date) },
            { label: "Categoría", value: category.label },
            { label: "Notas", value: expense.notes },
          ]}
        />
      </div>
    </BottomSheet>
  );
}
