import { describe, expect, it } from "vitest";
import { dueBucket, dueText, groupUpcoming, partsByParent, progressOf } from "../installments";
import { totalsByBank } from "../banks";
import type { PersonalExpense, RecurringExpense } from "../../types";

const TODAY = "2026-11-16";
const expense = (o: Partial<PersonalExpense>): PersonalExpense => ({
  id: "e", ownerId: "me", amount: 300, currency: "EUR", description: "Dentista", categoryId: "otros",
  date: "2026-11-27", status: "future", createdAt: 0, updatedAt: 0, ...o,
});

describe("progressOf", () => {
  const parent = expense({ id: "p" });
  const part = (id: string, amount: number, date: string) => expense({ id, amount, date, status: "done", partOfId: "p" });

  it("is all still to pay with no parts", () => {
    expect(progressOf(parent, partsByParent([parent]))).toEqual({ total: 300, paid: 0, remaining: 300, parts: [] });
  });
  it("subtracts the parts paid so far, oldest first", () => {
    const all = [parent, part("b", 50, "2026-11-12"), part("a", 100.1, "2026-11-10"), expense({ id: "x", status: "done" })];
    const progress = progressOf(parent, partsByParent(all));
    expect(progress.paid).toBe(150.1);
    expect(progress.remaining).toBe(149.9);
    expect(progress.parts.map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("never goes below zero if the parts add up to more than the total", () => {
    expect(progressOf(parent, partsByParent([parent, part("a", 400, "2026-11-10")])).remaining).toBe(0);
  });
});

describe("due helpers", () => {
  it("buckets by urgency", () => {
    expect(dueBucket(expense({ date: "2026-11-15" }), TODAY)).toBe("overdue");
    expect(dueBucket(expense({ date: TODAY }), TODAY)).toBe("soon");
    expect(dueBucket(expense({ date: "2026-11-23" }), TODAY)).toBe("soon");
    expect(dueBucket(expense({ date: "2026-11-24" }), TODAY)).toBe("later");
    expect(dueBucket(expense({ undated: true, date: "2020-01-01" }), TODAY)).toBe("undated");
  });
  it("describes the distance in words", () => {
    expect(dueText(expense({ date: TODAY }), TODAY)).toBe("Hoy");
    expect(dueText(expense({ date: "2026-11-17" }), TODAY)).toBe("Mañana");
    expect(dueText(expense({ date: "2026-11-13" }), TODAY)).toBe("Venció hace 3 días");
    expect(dueText(expense({ date: "2027-03-01" }), TODAY)).toBeNull();
    expect(dueText(expense({ undated: true }), TODAY)).toBeNull();
  });
  it("orders groups overdue, soon, later, undated", () => {
    const groups = groupUpcoming(
      [
        expense({ id: "u", undated: true }),
        expense({ id: "l", date: "2026-12-20" }),
        expense({ id: "s2", date: "2026-11-20" }),
        expense({ id: "o", date: "2026-11-01" }),
        expense({ id: "s1", date: "2026-11-18" }),
      ],
      TODAY
    );
    expect(groups.map((g) => [g.bucket, g.items.map((i) => i.id)])).toEqual([
      ["overdue", ["o"]],
      ["soon", ["s1", "s2"]],
      ["later", ["l"]],
      ["undated", ["u"]],
    ]);
  });
});

describe("totalsByBank", () => {
  const fixed = (o: Partial<RecurringExpense>): RecurringExpense => ({
    id: "r", ownerId: "me", amount: 10, currency: "EUR", description: "x", categoryId: "otros", dayOfMonth: 1,
    periodicity: "monthly", startDate: "2026-01-01", active: true, createdAt: 0, updatedAt: 0, ...o,
  });
  it("totals per bank, biggest first, unassigned last, with what's still unpaid", () => {
    const totals = totalsByBank(
      [
        fixed({ id: "a", amount: 650, bankId: "ing" }),
        fixed({ id: "b", amount: 12.99, bankId: "ing", lastCompletedMonth: "2026-11" }),
        fixed({ id: "c", amount: 900, bankId: "san" }),
        fixed({ id: "d", amount: 30 }),
        fixed({ id: "e", amount: 5, bankId: "deleted-bank" }),
      ],
      "2026-11",
      new Set(["ing", "san"]),
      "EUR"
    );
    expect(totals).toEqual([
      { bankId: "san", count: 1, total: 900, pending: 900 },
      { bankId: "ing", count: 2, total: 662.99, pending: 650 },
      { bankId: null, count: 2, total: 35, pending: 35 },
    ]);
  });
});
