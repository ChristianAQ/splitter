import type { Currency, Debt, ISODate } from "../types";
import { isSettled, recordPayment, remainingAmount, settleDebt, type DebtProgress } from "./debts";
import { toMinorUnits } from "./money";

/** Everything open between the user and one person, netted into one figure. */
export interface PersonBalance {
  /** Stable id for the person (normalized name + currency). */
  key: string;
  /** The name as most recently written. */
  name: string;
  currency: Currency;
  /** What I owe them, in total. */
  iOwe: number;
  /** What they owe me, in total. */
  owedToMe: number;
  /** owedToMe - iOwe: positive = they pay me, negative = I pay them. */
  net: number;
  /** The open debts behind it, most urgent first. */
  debts: Debt[];
  /** Earliest deadline among them, if any has one. */
  nextDue?: ISODate;
  overdue: boolean;
}

/** "Ana", " ana " and "ANÁ" are the same person. */
export function personKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** How to write the person's name when the entries spell it differently
 * ("marta", "Marta "): the spelling used most, preferring one with capitals,
 * so the name doesn't change as entries get settled. */
function displayName(debts: Debt[]): string {
  const counts = new Map<string, number>();
  for (const d of debts) {
    const name = (d.person ?? "").trim().replace(/\s+/g, " ");
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const hasCapitals = (n: string) => n !== n.toLowerCase();
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || Number(hasCapitals(b[0])) - Number(hasCapitals(a[0])) || a[0].localeCompare(b[0]))[0];
  return best?.[0] ?? "Sin nombre";
}

const byUrgency = (a: Debt, b: Debt) => {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.date.localeCompare(b.date);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
};

/**
 * Open debts grouped by person and netted: if I owe Marta 300 and she owes
 * me 100, that's one line — I pay Marta 200 — not two. People with the most
 * pressing deadline come first (overdue, then soonest), then the rest by
 * how much is at stake.
 */
export function balancesByPerson(debts: Debt[], today: ISODate): PersonBalance[] {
  const groups = new Map<string, Debt[]>();
  for (const d of debts) {
    if (isSettled(d) || d.kind === "reminder") continue;
    const key = `${personKey(d.person ?? "")}|${d.currency}`;
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }

  const people: PersonBalance[] = [];
  for (const [key, list] of groups) {
    let oweMinor = 0;
    let owedMinor = 0;
    for (const d of list) {
      const minor = toMinorUnits(remainingAmount(d), d.currency);
      if (d.kind === "owe") oweMinor += minor;
      else owedMinor += minor;
    }
    const sorted = [...list].sort(byUrgency);
    const nextDue = sorted.find((d) => d.dueDate)?.dueDate;
    people.push({
      key,
      name: displayName(list),
      currency: list[0].currency,
      iOwe: oweMinor / 100,
      owedToMe: owedMinor / 100,
      net: (owedMinor - oweMinor) / 100,
      debts: sorted,
      nextDue,
      overdue: nextDue !== undefined && nextDue < today,
    });
  }

  return people.sort((a, b) => {
    if (a.nextDue && b.nextDue) return a.nextDue.localeCompare(b.nextDue) || Math.abs(b.net) - Math.abs(a.net);
    if (a.nextDue) return -1;
    if (b.nextDue) return 1;
    return Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name);
  });
}

/** What the user owes and is owed overall, after netting per person. */
export function netTotals(people: PersonBalance[], currency: string): { iOwe: number; owedToMe: number } {
  let owe = 0;
  let owed = 0;
  for (const p of people) {
    if (p.currency !== currency) continue;
    const minor = toMinorUnits(p.net, currency);
    if (minor < 0) owe -= minor;
    else owed += minor;
  }
  return { iOwe: owe / 100, owedToMe: owed / 100 };
}

export interface DebtUpdate {
  debt: Debt;
  progress: DebtProgress;
}

/** One payment of the net amount clears everything open with the person,
 * in both directions. */
export function settleAllWith(person: PersonBalance, today: ISODate, now: number): DebtUpdate[] {
  return person.debts.map((debt) => ({ debt, progress: settleDebt(debt, today, now) }));
}

/**
 * A payment of part of the net amount. It goes against the debts on the
 * side that owes (mine if I'm the one paying, theirs if they are), most
 * urgent first; debts in the other direction are left alone, so the net
 * drops by exactly what was paid. Paying the whole net (or more) settles
 * everything.
 */
export function payTowards(person: PersonBalance, amount: number, today: ISODate, now: number): DebtUpdate[] {
  const netMinor = Math.abs(toMinorUnits(person.net, person.currency));
  let left = toMinorUnits(amount, person.currency);
  if (left <= 0) return [];
  if (left >= netMinor) return settleAllWith(person, today, now);

  const payingKind = person.net < 0 ? "owe" : "owed";
  const updates: DebtUpdate[] = [];
  for (const debt of person.debts) {
    if (left <= 0) break;
    if (debt.kind !== payingKind) continue;
    const share = Math.min(left, toMinorUnits(remainingAmount(debt), debt.currency));
    if (share <= 0) continue;
    updates.push({ debt, progress: recordPayment(debt, share / 100, today, now) });
    left -= share;
  }
  return updates;
}
