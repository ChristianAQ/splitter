import type { Currency, ISODate } from "../types";

export function formatCurrency(amount: number, currency: Currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSignedCurrency(amount: number, currency: Currency = "EUR"): string {
  const formatted = formatCurrency(Math.abs(amount), currency);
  if (amount > 0.004) return `+${formatted}`;
  if (amount < -0.004) return `-${formatted}`;
  return formatted;
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const dateFormatterLong = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

export function formatDate(iso: ISODate): string {
  return dateFormatter.format(isoToLocalDate(iso));
}

export function formatDateLong(iso: ISODate): string {
  return dateFormatterLong.format(isoToLocalDate(iso));
}

export function formatMonth(iso: ISODate): string {
  return monthFormatter.format(isoToLocalDate(iso));
}

function isoToLocalDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
