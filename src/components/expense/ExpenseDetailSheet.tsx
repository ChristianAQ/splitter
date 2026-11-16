import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Card";
import { DetailHero, DetailRows, EditAction } from "../ui/Detail";
import { usePartialPayment } from "../../hooks/usePartialPayment";
import { categoryById } from "../../lib/categories";
import { dueBucket, dueText, type PaymentProgress } from "../../domain/installments";
import { todayISO } from "../../domain/date";
import { formatCurrency, formatDateLong } from "../../lib/format";
import type { PersonalExpense } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: PersonalExpense;
  onEdit: () => void;
  /** For an upcoming expense: where it stands, and how to pay it. Each
   * returns once the payment is recorded (or throws). */
  progress?: PaymentProgress;
  onPayPart?: (amount: number) => Promise<void>;
  onPayAll?: () => Promise<void>;
}

/**
 * Read-only view of a personal expense; editing is a separate step, from
 * the header.
 *
 * For one that's still to be paid it's also where it gets paid — all at
 * once, or a part at a time, with the same guided step debts use. Every
 * part becomes a real expense on the day it's paid.
 */
export function ExpenseDetailSheet({ open, onClose, expense, onEdit, progress, onPayPart, onPayAll }: Props) {
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const pay = usePartialPayment({
    remaining: progress?.remaining ?? 0,
    currency: expense?.currency ?? "EUR",
    question: "¿Cuánto pagas ahora?",
    verb: "Pagar",
    busy,
    onBack: () => setPaying(false),
    onConfirm: (amount, coversAll) => void run(() => (coversAll ? onPayAll?.() : onPayPart?.(amount)), coversAll),
  });

  useEffect(() => {
    if (open) {
      setPaying(false);
      pay.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  async function run(action: () => Promise<void> | undefined, closeAfter: boolean) {
    setBusy(true);
    try {
      await action();
      setPaying(false);
      pay.reset();
      if (closeAfter) onClose();
    } catch {
      /* the caller has already shown why */
    } finally {
      setBusy(false);
    }
  }

  if (!expense) return <BottomSheet open={false} onClose={onClose} children={null} />;

  const category = categoryById(expense.categoryId);
  const upcoming = expense.status === "future" && progress !== undefined;
  const chipStyle = { backgroundColor: `${category.color}22`, color: category.color };

  if (!upcoming) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Gasto" headerAction={<EditAction onClick={onEdit} />}>
        <div className="flex flex-col gap-5 pb-2">
          <DetailHero
            icon={category.icon}
            chipStyle={chipStyle}
            title={expense.description}
            amount={formatCurrency(expense.amount, expense.currency)}
            caption={
              expense.partOfId
                ? "Pago parcial de un gasto mayor"
                : expense.plannedAmount
                  ? `Último pago de un total de ${formatCurrency(expense.plannedAmount, expense.currency)}`
                  : undefined
            }
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

  if (paying) {
    return (
      <BottomSheet open={open} onClose={onClose} title={pay.title} footer={pay.footer}>
        {pay.children}
      </BottomSheet>
    );
  }

  const today = todayISO();
  const bucket = dueBucket(expense, today);
  const relative = dueText(expense, today);
  const percent = Math.round((progress.paid / progress.total) * 100);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Por pagar"
      headerAction={<EditAction onClick={onEdit} />}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setPaying(true)} disabled={busy}>
            Pagar una parte
          </Button>
          <Button className="flex-1" onClick={() => void run(() => onPayAll?.(), true)} loading={busy}>
            <Check size={17} strokeWidth={2.6} />
            {progress.paid > 0 ? "Pagar el resto" : "Pagar todo"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <DetailHero
          icon={category.icon}
          chipStyle={chipStyle}
          title={expense.description}
          amount={formatCurrency(progress.remaining, expense.currency)}
          caption={progress.paid > 0 ? "Te queda por pagar" : "Todavía no cuenta en tus gastos"}
        />

        {progress.paid > 0 && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[13px] text-neutral-500 dark:text-neutral-400">
              <span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-50">{formatCurrency(progress.paid, expense.currency)}</span> pagado
              </span>
              <span>de {formatCurrency(progress.total, expense.currency)}</span>
            </div>
          </div>
        )}

        <DetailRows
          rows={[
            {
              label: "Para cuándo",
              value: expense.undated ? (
                "Sin fecha, cuando se pueda"
              ) : (
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                  {formatDateLong(expense.date)}
                  {bucket === "overdue" && <Badge tone="negative">{relative ?? "Vencido"}</Badge>}
                  {bucket === "soon" && relative && <Badge tone="warning">{relative}</Badge>}
                </span>
              ),
            },
            { label: "Categoría", value: category.label },
            { label: "Notas", value: expense.notes },
          ]}
        />

        {progress.parts.length > 0 && (
          <div>
            <h4 className="eyebrow mb-2 px-1">Pagos hechos</h4>
            <ul className="well divide-y divide-black/[0.06] rounded-[22px] px-4 dark:divide-white/[0.08]">
              {[...progress.parts].reverse().map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{formatDateLong(p.date)}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
              Cada pago ya cuenta como gasto en el día en que lo hiciste.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
