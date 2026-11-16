import { ArrowDownLeft, ArrowUpRight, BellRing, type LucideIcon } from "lucide-react";
import type { Debt, DebtKind } from "../types";

interface KindMeta {
  /** Segmented-control label in the form. */
  short: string;
  icon: LucideIcon;
  /** Tailwind classes for the round icon chip. */
  chip: string;
  /** Tailwind text color for the outstanding amount. */
  amount: string;
}

export const DEBT_KIND_META: Record<DebtKind, KindMeta> = {
  owe: {
    short: "Debo",
    icon: ArrowUpRight,
    chip: "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark",
    amount: "text-negative dark:text-negative-dark",
  },
  owed: {
    short: "Me deben",
    icon: ArrowDownLeft,
    chip: "bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark",
    amount: "text-positive dark:text-positive-dark",
  },
  reminder: {
    short: "Pendiente",
    icon: BellRing,
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    amount: "text-neutral-900 dark:text-neutral-50",
  },
};

export const DEBT_KIND_OPTIONS = (Object.keys(DEBT_KIND_META) as DebtKind[]).map((k) => [k, DEBT_KIND_META[k].short] as const);

/** Headline for a debt row: the person for loans, the concept for reminders. */
export function debtTitle(debt: Debt): string {
  if (debt.kind === "reminder") return debt.concept || "Pago pendiente";
  return debt.person || debt.concept || "Sin nombre";
}

/** One-line description: "Le debes a Ana", "Marcos te debe"... */
export function debtRelation(debt: Debt): string {
  if (debt.kind === "owe") return "Le debes";
  if (debt.kind === "owed") return "Te debe";
  return "Por pagar";
}
