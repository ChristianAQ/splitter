import { describe, expect, it } from "vitest";
import { upcomingPayments } from "../upcoming";
import type { Debt, PersonalExpense, RecurringExpense } from "../../types";

const TODAY = "2026-11-16";

const expense = (o: Partial<PersonalExpense>): PersonalExpense => ({
  id: "e", ownerId: "me", amount: 10, currency: "EUR", description: "Gasto", categoryId: "otros",
  date: "2026-11-20", status: "future", createdAt: 0, updatedAt: 0, ...o,
});
const recurring = (o: Partial<RecurringExpense>): RecurringExpense => ({
  id: "r", ownerId: "me", amount: 50, currency: "EUR", description: "Alquiler", categoryId: "vivienda",
  dayOfMonth: 28, periodicity: "monthly", startDate: "2026-01-28", active: true, createdAt: 0, updatedAt: 0, ...o,
});
const debt = (o: Partial<Debt>): Debt => ({
  id: "d", ownerId: "me", kind: "owe", person: "Ana", amount: 100, paidAmount: 0, currency: "EUR",
  date: "2026-11-01", createdAt: 0, updatedAt: 0, ...o,
});

describe("upcomingPayments", () => {
  it("merges the three sources, soonest first", () => {
    const items = upcomingPayments(
      [expense({ id: "e1", date: "2026-11-25", description: "Dentista" })],
      [recurring({ id: "r1" })],
      [debt({ id: "d1", dueDate: "2026-11-18" })],
      TODAY
    );
    expect(items.map((i) => [i.kind, i.date])).toEqual([
      ["debt", "2026-11-18"],
      ["expense", "2026-11-25"],
      ["recurring", "2026-11-28"],
    ]);
  });

  it("shows what's left of an expense paid in part, and puts undated ones last", () => {
    const items = upcomingPayments(
      [
        expense({ id: "u", description: "Fianza", amount: 500, undated: true, date: "2026-01-01" }),
        expense({ id: "p", description: "Dentista", amount: 300, date: "2026-11-25" }),
        expense({ id: "c", amount: 120, date: "2026-11-10", status: "done", partOfId: "p" }),
      ],
      [],
      [],
      TODAY
    );
    expect(items.map((i) => [i.title, i.date, i.amount, i.overdue])).toEqual([
      ["Dentista", "2026-11-25", 180, false],
      ["Fianza", null, 500, false],
    ]);
  });

  it("only counts expenses still marked as future", () => {
    expect(upcomingPayments([expense({ status: "done" })], [], [], TODAY)).toEqual([]);
  });

  it("drops fixed expenses already ticked off this month, and inactive ones", () => {
    const items = upcomingPayments([], [recurring({ lastCompletedMonth: "2026-11" }), recurring({ id: "r2", active: false })], [], TODAY);
    expect(items).toEqual([]);
  });

  it("keeps a fixed expense whose day has passed, without calling it overdue", () => {
    const [item] = upcomingPayments([], [recurring({ dayOfMonth: 5, startDate: "2026-01-05" })], [], TODAY);
    expect(item.date).toBe("2026-11-05");
    expect(item.overdue).toBe(false);
  });

  it("includes what I owe with a deadline, at what's left to pay; flags overdue", () => {
    const [item] = upcomingPayments([], [], [debt({ dueDate: "2026-11-10", paidAmount: 40 })], TODAY);
    expect(item.amount).toBe(60);
    expect(item.overdue).toBe(true);
  });

  it("leaves out money owed to me, settled debts, open-ended ones and far-off deadlines", () => {
    const items = upcomingPayments(
      [],
      [],
      [
        debt({ id: "a", kind: "owed", dueDate: "2026-11-20" }),
        debt({ id: "b", dueDate: "2026-11-20", settledAt: 1 }),
        debt({ id: "c" }),
        debt({ id: "d", dueDate: "2027-03-01" }),
      ],
      TODAY
    );
    expect(items).toEqual([]);
  });
});
