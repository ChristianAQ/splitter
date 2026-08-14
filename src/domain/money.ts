// All money math happens in integer minor units (cents) to avoid floating
// point drift. Amounts cross the domain boundary as decimal `number`
// (euros/dollars/pounds, e.g. 12.5) since that's what Firestore stores and
// what forms bind to — convert at the edges with toMinorUnits/fromMinorUnits.

export const CURRENCY_DECIMALS: Record<string, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
};

export function toMinorUnits(amount: number, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  return Math.round(amount * 10 ** decimals);
}

export function fromMinorUnits(minor: number, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  return minor / 10 ** decimals;
}

export function roundToCurrency(amount: number, currency: string): number {
  return fromMinorUnits(toMinorUnits(amount, currency), currency);
}
