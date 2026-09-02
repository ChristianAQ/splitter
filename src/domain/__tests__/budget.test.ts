import { describe, expect, it } from "vitest";
import { pendingRecurringCount, recurringSpentForMonth, summarizeRecurringBudget } from "../budget";
import type { RecurringExpense } from "../../types";

function mk(partial: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: "r1",
    ownerId: "u1",
    amount: 10,
    currency: "EUR",
    description: "Netflix",
    categoryId: "suscripciones",
    dayOfMonth: 15,
    periodicity: "monthly",
    startDate: "2026-01-01",
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe("summarizeRecurringBudget", () => {
  it("sums every recurring expense regardless of checked state", () => {
    const items = [mk({ id: "a", amount: 15 }), mk({ id: "b", amount: 40 })];
    const summary = summarizeRecurringBudget(items, "2026-03", 0);
    expect(summary.totalRecurring).toBe(55);
  });

  it("splits spent vs pending by lastCompletedMonth", () => {
    const items = [
      mk({ id: "a", amount: 15, lastCompletedMonth: "2026-03" }),
      mk({ id: "b", amount: 40 }),
      mk({ id: "c", amount: 5, lastCompletedMonth: "2026-02" }), // a different month doesn't count
    ];
    const summary = summarizeRecurringBudget(items, "2026-03", 0);
    expect(summary.spent).toBe(15);
    expect(summary.pending).toBe(45);
  });

  it("computes remainingNow as available minus what's already checked off", () => {
    const items = [mk({ id: "a", amount: 15, lastCompletedMonth: "2026-03" }), mk({ id: "b", amount: 40 })];
    const summary = summarizeRecurringBudget(items, "2026-03", 1000);
    expect(summary.remainingNow).toBe(985);
  });

  it("computes projectedLeftover as available minus every recurring expense", () => {
    const items = [mk({ id: "a", amount: 15, lastCompletedMonth: "2026-03" }), mk({ id: "b", amount: 40 })];
    const summary = summarizeRecurringBudget(items, "2026-03", 1000);
    expect(summary.projectedLeftover).toBe(945);
  });

  it("can go negative when available money doesn't cover the recurring total", () => {
    const items = [mk({ id: "a", amount: 600 })];
    const summary = summarizeRecurringBudget(items, "2026-03", 500);
    expect(summary.projectedLeftover).toBe(-100);
  });

  it("returns zeros for an empty list", () => {
    const summary = summarizeRecurringBudget([], "2026-03", 200);
    expect(summary).toEqual({ totalRecurring: 0, spent: 0, pending: 0, remainingNow: 200, projectedLeftover: 200 });
  });
});

describe("recurringSpentForMonth", () => {
  it("sums only items checked off for the given month", () => {
    const items = [
      mk({ id: "a", amount: 15, lastCompletedMonth: "2026-03" }),
      mk({ id: "b", amount: 40, lastCompletedMonth: "2026-02" }),
      mk({ id: "c", amount: 5 }),
    ];
    expect(recurringSpentForMonth(items, "2026-03")).toBe(15);
  });

  it("returns 0 when nothing is checked off", () => {
    expect(recurringSpentForMonth([mk({ amount: 15 })], "2026-03")).toBe(0);
  });
});

describe("pendingRecurringCount", () => {
  it("counts items not checked off for the given month", () => {
    const items = [
      mk({ id: "a", lastCompletedMonth: "2026-03" }),
      mk({ id: "b", lastCompletedMonth: "2026-02" }),
      mk({ id: "c" }),
    ];
    expect(pendingRecurringCount(items, "2026-03")).toBe(2);
  });

  it("returns 0 when everything is checked off", () => {
    expect(pendingRecurringCount([mk({ lastCompletedMonth: "2026-03" })], "2026-03")).toBe(0);
  });
});
