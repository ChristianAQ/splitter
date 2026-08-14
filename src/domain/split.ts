import type { ExpenseSplit, SplitMethod } from "../types";
import { fromMinorUnits, toMinorUnits } from "./money";

export interface SplitValidationError {
  code: "no_participants" | "amount_mismatch" | "negative_share" | "duplicate_participant";
  message: string;
}

export interface SplitResult {
  ok: boolean;
  splits: ExpenseSplit[];
  error?: SplitValidationError;
}

/**
 * Splits `totalAmount` equally across `participantIds`, in integer minor
 * units, distributing the leftover cent(s) from integer division to the
 * first participants (stable order) so the shares always sum exactly to the
 * total — never silently short-changing the payer by a cent.
 */
export function splitEqual(
  totalAmount: number,
  currency: string,
  participantIds: string[]
): SplitResult {
  const unique = dedupe(participantIds);
  if (unique.length === 0) {
    return { ok: false, splits: [], error: { code: "no_participants", message: "Selecciona al menos un participante." } };
  }

  const totalMinor = toMinorUnits(totalAmount, currency);
  const base = Math.floor(totalMinor / unique.length);
  let remainder = totalMinor - base * unique.length;

  const splits: ExpenseSplit[] = unique.map((uid) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { uid, amount: fromMinorUnits(base + extra, currency) };
  });

  return { ok: true, splits };
}

/**
 * Splits by explicit per-participant amount. The caller-supplied amounts
 * must sum exactly to `totalAmount` (validated in minor units to sidestep
 * float rounding) — this is enforced here so a bad client can never
 * persist a group expense whose shares don't add up.
 */
export function splitByAmount(
  totalAmount: number,
  currency: string,
  amounts: Record<string, number>
): SplitResult {
  const entries = Object.entries(amounts);
  if (entries.length === 0) {
    return { ok: false, splits: [], error: { code: "no_participants", message: "Selecciona al menos un participante." } };
  }
  if (entries.some(([, amt]) => amt < 0)) {
    return { ok: false, splits: [], error: { code: "negative_share", message: "Los importes no pueden ser negativos." } };
  }

  const totalMinor = toMinorUnits(totalAmount, currency);
  const sumMinor = entries.reduce((sum, [, amt]) => sum + toMinorUnits(amt, currency), 0);

  if (sumMinor !== totalMinor) {
    return {
      ok: false,
      splits: [],
      error: {
        code: "amount_mismatch",
        message: `La suma de las partes (${fromMinorUnits(sumMinor, currency)}) no coincide con el total (${fromMinorUnits(totalMinor, currency)}).`,
      },
    };
  }

  const splits: ExpenseSplit[] = entries
    .filter(([, amt]) => amt > 0)
    .map(([uid, amt]) => ({ uid, amount: roundTrip(amt, currency) }));

  return { ok: true, splits };
}

export function computeSplit(
  method: SplitMethod,
  totalAmount: number,
  currency: string,
  participantIds: string[],
  amounts?: Record<string, number>
): SplitResult {
  if (method === "equal") return splitEqual(totalAmount, currency, participantIds);
  return splitByAmount(totalAmount, currency, amounts ?? {});
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function roundTrip(amount: number, currency: string): number {
  return fromMinorUnits(toMinorUnits(amount, currency), currency);
}
