import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { AmountInput } from "../ui/AmountInput";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Card";
import { DetailHero, DetailRows, EditAction } from "../ui/Detail";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { setDebtProgress } from "../../services/debts.service";
import { dueLabel, dueState, isSettled, paymentsOf, recordPayment, remainingAmount, reopenDebt, settleDebt } from "../../domain/debts";
import { localISO, todayISO } from "../../domain/date";
import { toMinorUnits } from "../../domain/money";
import { DEBT_KIND_META } from "../../lib/debts";
import { formatCurrency, formatDate, formatDateLong } from "../../lib/format";
import type { Debt, DebtKind } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  debt?: Debt;
  onEdit: () => void;
}

// Every kind says the same things in its own words — a debt you owe is
// "returned", one owed to you is "collected", a reminder is "paid".
const COPY: Record<
  DebtKind,
  {
    sheetTitle: string;
    eyebrow: (person: string) => string;
    remaining: string;
    done: string;
    partial: string;
    full: string;
    ask: string;
    confirm: string;
    history: string;
    progress: string;
    toastPartial: string;
    toastFull: string;
  }
> = {
  owe: {
    sheetTitle: "Deuda",
    eyebrow: (p) => `Le debes a ${p}`,
    remaining: "Te queda por devolver",
    done: "Devuelta",
    partial: "Devolver una parte",
    full: "Devolver todo",
    ask: "¿Cuánto le devuelves?",
    confirm: "Devolver",
    history: "Devoluciones",
    progress: "devuelto",
    toastPartial: "Devolución registrada",
    toastFull: "Deuda saldada",
  },
  owed: {
    sheetTitle: "Préstamo",
    eyebrow: (p) => `${p} te debe`,
    remaining: "Te queda por cobrar",
    done: "Cobrado",
    partial: "Cobrar una parte",
    full: "Cobrar todo",
    ask: "¿Cuánto te ha devuelto?",
    confirm: "Cobrar",
    history: "Cobros",
    progress: "cobrado",
    toastPartial: "Cobro registrado",
    toastFull: "Préstamo cobrado",
  },
  reminder: {
    sheetTitle: "Pago pendiente",
    eyebrow: () => "Tienes pendiente",
    remaining: "Te queda por pagar",
    done: "Pagado",
    partial: "Pagar una parte",
    full: "Pagar todo",
    ask: "¿Cuánto has pagado?",
    confirm: "Pagar",
    history: "Pagos",
    progress: "pagado",
    toastPartial: "Pago registrado",
    toastFull: "Pagado",
  },
};

/**
 * What you see when you tap a debt: everything about it, read-only, and
 * the two things you can actually *do* to it — pay part, or pay it off.
 * Changing its details is a separate, deliberate step ("Editar", top
 * right), which opens the form.
 *
 * Paying part is its own small step inside this sheet rather than a field
 * sitting among the others: one question ("¿cuánto?"), a live preview of
 * what will be left, one button that says exactly what it will record.
 */
export function DebtDetailSheet({ open, onClose, debt, onEdit }: Props) {
  const { user } = useAuth();
  const { show } = useToast();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPaying(false);
      setAmount("");
    }
  }, [open, debt?.id]);

  if (!debt) return <BottomSheet open={false} onClose={onClose} children={null} />;

  const copy = COPY[debt.kind];
  const meta = DEBT_KIND_META[debt.kind];
  const settled = isSettled(debt);
  const remaining = remainingAmount(debt);
  const paid = settled ? debt.amount : debt.paidAmount;
  const percent = Math.round(Math.min(paid / debt.amount, 1) * 100);
  const today = todayISO();
  const state = dueState(debt, today);
  const relative = dueLabel(debt, today);
  const payments = paymentsOf(debt);
  const title = debt.kind === "reminder" ? debt.concept || "Pago pendiente" : debt.person || "Sin nombre";

  const value = parseFloat(amount);
  const valueMinor = value > 0 ? toMinorUnits(value, debt.currency) : 0;
  const remainingMinor = toMinorUnits(remaining, debt.currency);
  const tooMuch = valueMinor > remainingMinor;
  const coversAll = valueMinor > 0 && valueMinor >= remainingMinor;
  const leftAfter = (remainingMinor - Math.min(valueMinor, remainingMinor)) / 100;

  async function run(progress: Parameters<typeof setDebtProgress>[2], message: string, closeAfter: boolean) {
    if (!user || !debt) return;
    setBusy(true);
    try {
      await setDebtProgress(user.uid, debt.id, progress);
      show(message, "success");
      setPaying(false);
      setAmount("");
      if (closeAfter) onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo guardar.", "error");
    } finally {
      setBusy(false);
    }
  }

  const payPartial = () => {
    if (!(value > 0) || tooMuch) return;
    const progress = recordPayment(debt, value, today, Date.now());
    // Stays open after a partial payment so the new balance is right there
    // to see; a payment that clears the debt has nothing left to show.
    return run(progress, progress.settled ? copy.toastFull : copy.toastPartial, progress.settled);
  };
  const payAll = () => run(settleDebt(debt, today, Date.now()), copy.toastFull, true);
  const reopen = () => run(reopenDebt(debt), "Vuelve a estar pendiente", false);

  if (paying) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={copy.ask}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPaying(false)} disabled={busy}>
              <ArrowLeft size={17} strokeWidth={2.2} />
              Volver
            </Button>
            <Button className="flex-1" onClick={payPartial} loading={busy} disabled={!(value > 0) || tooMuch}>
              {value > 0 && !tooMuch ? `${copy.confirm} ${formatCurrency(value, debt.currency)}` : copy.confirm}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pb-2 pt-3">
          <AmountInput value={amount} onChange={setAmount} currency={debt.currency} autoFocus large />

          <div className="flex justify-center gap-2">
            {remainingMinor >= 2 && (
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(remainingMinor / 2) / 100))}
                className="well well-press pressable rounded-full px-3.5 py-2 text-[13px] font-semibold text-neutral-700 dark:text-neutral-200"
              >
                La mitad
              </button>
            )}
            <button
              type="button"
              onClick={() => setAmount(String(remaining))}
              className="well well-press pressable rounded-full px-3.5 py-2 text-[13px] font-semibold text-neutral-700 dark:text-neutral-200"
            >
              Todo · {formatCurrency(remaining, debt.currency)}
            </button>
          </div>

          <p
            className={`rounded-[18px] px-4 py-3 text-center text-sm ${
              tooMuch
                ? "bg-negative/10 text-negative dark:text-negative-dark"
                : coversAll
                  ? "bg-positive/10 text-positive dark:text-positive-dark"
                  : "well text-neutral-600 dark:text-neutral-300"
            }`}
            aria-live="polite"
          >
            {tooMuch ? (
              <>Solo quedan {formatCurrency(remaining, debt.currency)} pendientes.</>
            ) : coversAll ? (
              <>Con esto queda saldado del todo.</>
            ) : value > 0 ? (
              <>
                Después quedarán <span className="font-semibold">{formatCurrency(leftAfter, debt.currency)}</span> pendientes.
              </>
            ) : (
              <>
                Ahora mismo quedan <span className="font-semibold">{formatCurrency(remaining, debt.currency)}</span> pendientes.
              </>
            )}
          </p>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={copy.sheetTitle}
      headerAction={<EditAction onClick={onEdit} />}
      footer={
        settled ? (
          <Button variant="secondary" className="w-full" onClick={reopen} loading={busy}>
            Volver a marcar como pendiente
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPaying(true)} disabled={busy}>
              {copy.partial}
            </Button>
            <Button className="flex-1" onClick={payAll} loading={busy}>
              <Check size={17} strokeWidth={2.6} />
              {copy.full}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <DetailHero
          icon={meta.icon}
          chipClassName={meta.chip}
          eyebrow={debt.kind === "reminder" ? copy.eyebrow("") : copy.eyebrow(title)}
          title={debt.kind === "reminder" ? title : debt.concept || (debt.kind === "owe" ? "Dinero prestado" : "Dinero que prestaste")}
          amount={formatCurrency(settled ? debt.amount : remaining, debt.currency)}
          amountClassName={settled ? "text-neutral-400 dark:text-neutral-500" : meta.amount}
          caption={
            settled ? (
              <span className="inline-flex items-center gap-1 font-semibold text-positive dark:text-positive-dark">
                <Check size={14} strokeWidth={2.8} />
                {copy.done}
                {debt.settledAt ? ` el ${formatDate(localISO(new Date(debt.settledAt)))}` : ""}
              </span>
            ) : (
              copy.remaining
            )
          }
        />

        {!settled && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[13px] text-neutral-500 dark:text-neutral-400">
              <span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-50">{formatCurrency(paid, debt.currency)}</span> {copy.progress}
              </span>
              <span>de {formatCurrency(debt.amount, debt.currency)}</span>
            </div>
          </div>
        )}

        <DetailRows
          rows={[
            {
              label: "Fecha límite",
              value: settled ? null : debt.dueDate ? (
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                  {formatDateLong(debt.dueDate)}
                  {state === "overdue" && <Badge tone="negative">{relative ?? "Vencida"}</Badge>}
                  {(state === "today" || state === "soon") && <Badge tone="warning">{relative}</Badge>}
                </span>
              ) : (
                "Sin fecha, cuando se pueda"
              ),
            },
            { label: debt.kind === "reminder" ? "Apuntado el" : "Fecha del préstamo", value: formatDateLong(debt.date) },
            { label: "Importe inicial", value: paid > 0 || settled ? formatCurrency(debt.amount, debt.currency) : null },
            { label: "Notas", value: debt.notes },
          ]}
        />

        {payments.length > 0 && (
          <div>
            <h4 className="eyebrow mb-2 px-1">{copy.history}</h4>
            <ul className="well divide-y divide-black/[0.06] rounded-[22px] px-4 dark:divide-white/[0.08]">
              {[...payments].reverse().map((p) => (
                <li key={p.at} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{formatDateLong(p.date)}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(p.amount, debt.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
