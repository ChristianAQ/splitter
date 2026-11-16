import { describe, expect, it } from "vitest";
import { applyRepayment, dueLabel, dueState, remainingAmount, sortDebts, summarizeDebts } from "../debts";
import { shiftMonth } from "../date";
import { occurrencesInRange } from "../recurring";
import type { Debt, RecurringExpense } from "../../types";

function debt(overrides: Partial<Debt>): Debt {
  return {
    id: "d",
    ownerId: "me",
    kind: "owe",
    person: "Ana",
    amount: 100,
    paidAmount: 0,
    currency: "EUR",
    date: "2026-11-01",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const TODAY = "2026-11-16";

describe("remainingAmount", () => {
  it("subtracts partial repayments without float drift", () => {
    expect(remainingAmount(debt({ amount: 0.3, paidAmount: 0.1 }))).toBe(0.2);
  });
  it("is zero once settled, whatever was recorded as paid", () => {
    expect(remainingAmount(debt({ paidAmount: 20, settledAt: 1 }))).toBe(0);
  });
});

describe("dueState / dueLabel", () => {
  it("has no state without a due date", () => {
    expect(dueState(debt({}), TODAY)).toBe("none");
    expect(dueLabel(debt({}), TODAY)).toBeNull();
  });
  it("classifies relative to today", () => {
    expect(dueState(debt({ dueDate: "2026-11-15" }), TODAY)).toBe("overdue");
    expect(dueState(debt({ dueDate: TODAY }), TODAY)).toBe("today");
    expect(dueState(debt({ dueDate: "2026-11-23" }), TODAY)).toBe("soon");
    expect(dueState(debt({ dueDate: "2026-11-24" }), TODAY)).toBe("later");
  });
  it("never flags a settled debt as overdue", () => {
    expect(dueState(debt({ dueDate: "2026-01-01", settledAt: 1 }), TODAY)).toBe("none");
  });
  it("labels in plain Spanish", () => {
    expect(dueLabel(debt({ dueDate: "2026-11-17" }), TODAY)).toBe("Vence mañana");
    expect(dueLabel(debt({ dueDate: "2026-11-13" }), TODAY)).toBe("Venció hace 3 días");
    expect(dueLabel(debt({ dueDate: "2026-12-01" }), TODAY)).toBe("Vence en 15 días");
  });
});

describe("summarizeDebts", () => {
  it("splits what I owe from what I'm owed and ignores settled ones", () => {
    const summary = summarizeDebts(
      [
        debt({ id: "a", kind: "owe", amount: 100, paidAmount: 40 }),
        debt({ id: "b", kind: "reminder", amount: 25, dueDate: "2026-11-10" }),
        debt({ id: "c", kind: "owed", amount: 60 }),
        debt({ id: "d", kind: "owed", amount: 500, settledAt: 1 }),
      ],
      "EUR",
      TODAY
    );
    expect(summary).toEqual({ iOwe: 85, owedToMe: 60, openCount: 3, overdueCount: 1 });
  });
  it("does not add other currencies into the totals", () => {
    const summary = summarizeDebts([debt({ currency: "USD" })], "EUR", TODAY);
    expect(summary.iOwe).toBe(0);
    expect(summary.openCount).toBe(1);
  });
});

describe("sortDebts", () => {
  it("puts dated debts first by due date, open-ended next, settled last", () => {
    const sorted = sortDebts([
      debt({ id: "settled", settledAt: 5 }),
      debt({ id: "whenever" }),
      debt({ id: "december", dueDate: "2026-12-01" }),
      debt({ id: "overdue", dueDate: "2026-11-01" }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(["overdue", "december", "whenever", "settled"]);
  });
});

describe("applyRepayment", () => {
  it("accumulates partial repayments", () => {
    expect(applyRepayment(debt({ paidAmount: 30 }), 20)).toEqual({ paidAmount: 50, settles: false });
  });
  it("clamps at the total and settles", () => {
    expect(applyRepayment(debt({ paidAmount: 90 }), 50)).toEqual({ paidAmount: 100, settles: true });
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-03", -1)).toBe("2026-02");
  });
});

describe("yearly recurrence starting on Feb 29", () => {
  it("falls back to Feb 28 in non-leap years", () => {
    const recurring: RecurringExpense = {
      id: "r",
      ownerId: "me",
      amount: 10,
      currency: "EUR",
      description: "x",
      categoryId: "otros",
      dayOfMonth: 29,
      periodicity: "yearly",
      startDate: "2024-02-29",
      active: true,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(occurrencesInRange(recurring, "2024-01-01", "2026-12-31")).toEqual(["2024-02-29", "2025-02-28", "2026-02-28"]);
  });
});
