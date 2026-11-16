import type { ISODate } from "../types";

// All arithmetic uses UTC internally so a calendar date ("2026-08-14") never
// shifts by a day because of the runtime's local timezone offset.

export function parseISO(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Calendar date of a moment *as the user sees it* (device timezone).
 * `formatISO` above is for the UTC-anchored dates this module does its
 * arithmetic on; using it for "now" reports yesterday's date during the
 * first hour(s) after local midnight anywhere east of Greenwich. */
export function localISO(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): ISODate {
  return localISO(new Date());
}

/** "YYYY-MM" shifted by `delta` months — pure string/integer math, so it
 * can't overflow the way `Date#setMonth` does on the 29th-31st. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMonthsClamped(date: Date, months: number, targetDay: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const normalizedYear = year + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  const clampedDay = Math.min(targetDay, daysInMonth(normalizedYear, normalizedMonth));
  return new Date(Date.UTC(normalizedYear, normalizedMonth, clampedDay));
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isWithin(date: ISODate, start: ISODate, end: ISODate): boolean {
  return compareISO(date, start) >= 0 && compareISO(date, end) <= 0;
}
