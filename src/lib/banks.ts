import type { Bank } from "../types";

/** Shown as one-tap starting points when adding a bank; any name and color
 * can be used instead. */
export const BANK_SUGGESTIONS: { name: string; color: string }[] = [
  { name: "ING", color: "#FF6200" },
  { name: "Santander", color: "#EC0000" },
  { name: "BBVA", color: "#1464A5" },
  { name: "CaixaBank", color: "#009AD8" },
  { name: "Sabadell", color: "#0099CC" },
  { name: "Revolut", color: "#7C3AED" },
  { name: "Efectivo", color: "#16A34A" },
];

/** Color for expenses with no bank assigned. */
export const NO_BANK_COLOR = "#9CA3AF";

export function newBankId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function bankById(banks: Bank[], id: string | undefined): Bank | undefined {
  return id ? banks.find((b) => b.id === id) : undefined;
}
