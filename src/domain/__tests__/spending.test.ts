import { describe, expect, it } from "vitest";
import { averageMonthlySpend, changePercent, dailyAverage, projectedMonthEnd, summarizeSpending } from "../spending";
import type { PersonalExpense } from "../../types";

const e = (o: Partial<PersonalExpense>): PersonalExpense => ({
  id: "e", ownerId: "me", amount: 10, currency: "EUR", description: "x", categoryId: "super",
  date: "2026-11-10", status: "done", createdAt: 0, updatedAt: 0, ...o,
});
const MONTHS = ["2026-09", "2026-10", "2026-11"];

describe("summarizeSpending", () => {
  const summary = summarizeSpending(
    [
      e({ amount: 62.4 }),
      e({ amount: 0.1, categoryId: "ocio" }),
      e({ amount: 0.2, categoryId: "ocio" }),
      e({ amount: 650, categoryId: "casa", recurringSourceId: "r1" }),
      e({ amount: 120, date: "2026-11-12", partOfId: "p" }), // a part paid towards an upcoming expense
      e({ amount: 999, status: "future" }), // not paid yet
      e({ amount: 30, date: "2026-10-03" }),
      e({ amount: 5, date: "2026-01-01" }), // outside the window
    ],
    { "2026-11": 25.5, "2026-09": 0 },
    MONTHS,
    "grupos"
  );

  it("splits a month into variable, fixed and groups, without float drift", () => {
    expect(summary.byMonth["2026-11"]).toEqual({ variable: 182.7, fixed: 650, groups: 25.5, total: 858.2, count: 5 });
  });
  it("leaves out upcoming expenses and months outside the window", () => {
    expect(summary.byMonth["2026-10"].total).toBe(30);
    expect(summary.byMonth["2026-09"].total).toBe(0);
  });
  it("breaks the month down by category, groups under their own id", () => {
    expect(summary.categories["2026-11"]).toEqual({ super: 182.4, ocio: 0.3, casa: 650, grupos: 25.5 });
    expect(summary.categories["2026-09"]).toEqual({});
  });
  it("averages over months that have spending", () => {
    expect(averageMonthlySpend(summary)).toBe(444.1);
  });
});

describe("month figures", () => {
  it("compares with the previous month only when there is one", () => {
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(150, 0)).toBeNull();
  });
  it("averages per day over the days elapsed, or the whole month once it's over", () => {
    expect(dailyAverage(160, "2026-11", "2026-11-16")).toBe(10);
    expect(dailyAverage(310, "2026-10", "2026-11-16")).toBe(10);
  });
  it("projects the rest of the month from the pace so far, keeping fixed costs as paid", () => {
    expect(projectedMonthEnd({ variable: 150, fixed: 650, groups: 10, total: 810, count: 4 }, "2026-11-16")).toBe(950);
  });
});
