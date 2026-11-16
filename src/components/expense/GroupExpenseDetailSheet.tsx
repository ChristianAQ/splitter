import { Lock } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Avatar } from "../ui/Avatar";
import { DetailHero, DetailRows, EditAction } from "../ui/Detail";
import { categoryById } from "../../lib/categories";
import { formatCurrency, formatDateLong } from "../../lib/format";
import type { GroupExpense, GroupMember } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: GroupExpense;
  members: Map<string, GroupMember>;
  currentUid: string;
  /** Only the expense's creator may change it, and not in a closed group. */
  canEdit: boolean;
  onEdit: () => void;
}

/** Read-only view of a group expense: who paid, and how it was split. */
export function GroupExpenseDetailSheet({ open, onClose, expense, members, currentUid, canEdit, onEdit }: Props) {
  if (!expense) return <BottomSheet open={false} onClose={onClose} children={null} />;

  const category = categoryById(expense.categoryId);
  const name = (uid: string) => (uid === currentUid ? "Tú" : members.get(uid)?.name ?? "Alguien que ya no está");
  const myShare = expense.splits.find((s) => s.uid === currentUid)?.amount;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Gasto del grupo"
      headerAction={canEdit ? <EditAction onClick={onEdit} /> : undefined}
    >
      <div className="flex flex-col gap-5 pb-2">
        <DetailHero
          icon={category.icon}
          chipStyle={{ backgroundColor: `${category.color}22`, color: category.color }}
          title={expense.description}
          amount={formatCurrency(expense.amount, expense.currency)}
          caption={
            myShare !== undefined ? (
              <>
                Tu parte: <span className="font-semibold text-neutral-900 dark:text-neutral-50">{formatCurrency(myShare, expense.currency)}</span>
              </>
            ) : (
              "No participas en este gasto"
            )
          }
        />
        <DetailRows
          rows={[
            { label: "Pagado por", value: name(expense.paidBy) },
            { label: "Fecha", value: formatDateLong(expense.date) },
            { label: "Categoría", value: category.label },
            { label: "Reparto", value: expense.splitMethod === "equal" ? "A partes iguales" : "Por importes" },
            { label: "Notas", value: expense.notes },
          ]}
        />

        <div>
          <h4 className="eyebrow mb-2 px-1">A cada uno le toca</h4>
          <ul className="well divide-y divide-black/[0.06] rounded-[22px] px-4 dark:divide-white/[0.08]">
            {expense.splits.map((s) => {
              const member = members.get(s.uid);
              return (
                <li key={s.uid} className="flex items-center gap-3 py-2.5 text-sm">
                  <Avatar name={member?.name ?? "?"} color={member?.color ?? "#9CA3AF"} photoUrl={member?.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{name(s.uid)}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(s.amount, expense.currency)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {!canEdit && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Lock size={13} strokeWidth={2.1} className="shrink-0" />
            Solo quien lo añadió puede cambiarlo.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
