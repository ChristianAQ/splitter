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

export function todayISO(): ISODate {
  return formatISO(new Date());
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
