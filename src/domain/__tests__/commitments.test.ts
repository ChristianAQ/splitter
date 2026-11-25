import { describe, expect, it } from "vitest";
import { commitmentOf, fixedOutlook, monthsUntil, summarizeCommitments } from "../commitments";
import type { RecurringExpense } from "../../types";

function mk(partial: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: "r1",
    ownerId: "u1",
    amount: 100,
    currency: "EUR",
    description: "Móvil",
    categoryId: "compras",
    dayOfMonth: 5,
    periodicity: "monthly",
    startDate: "2026-10-01",
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

const TODAY = "2026-11-20";

describe("commitmentOf", () => {
  it("a fixed expense with no end date has nothing left to pay", () => {
    const c = commitmentOf(mk({ description: "Alquiler", amount: 800 }), TODAY);
    expect(c.endDate).toBeNull();
    expect(c.remainingAmount).toBe(0);
    expect(c.monthlyEquivalent).toBe(800);
  });

  it("a 3-month plan started last month: this month's payment is still pending until ticked", () => {
    // Oct, Nov, Dec — October is behind us.
    const r = mk({ startDate: "2026-10-01", endDate: "2026-12-31" });
    const c = commitmentOf(r, TODAY);
    expect(c.totalPayments).toBe(3);
    expect(c.paidPayments).toBe(1);
    expect(c.remainingPayments).toBe(2);
    expect(c.remainingAmount).toBe(200);
    expect(c.lastPaymentDate).toBe("2026-12-05");
  });

  it("ticking off this month moves its payment to paid", () => {
    const r = mk({ startDate: "2026-10-01", endDate: "2026-12-31", lastCompletedMonth: "2026-11" });
    const c = commitmentOf(r, TODAY);
    expect(c.paidPayments).toBe(2);
    expect(c.remainingPayments).toBe(1);
    expect(c.remainingAmount).toBe(100);
  });

  it("a plan that has already finished has nothing left", () => {
    const c = commitmentOf(mk({ startDate: "2026-01-01", endDate: "2026-06-30" }), TODAY);
    expect(c.remainingPayments).toBe(0);
    expect(c.paidPayments).toBe(6);
  });

  it("yearly and weekly ones are expressed per month", () => {
    expect(commitmentOf(mk({ periodicity: "yearly", amount: 120 }), TODAY).monthlyEquivalent).toBe(10);
    expect(commitmentOf(mk({ periodicity: "weekly", amount: 12 }), TODAY).monthlyEquivalent).toBe(52);
  });
});

describe("summarizeCommitments", () => {
  const recurring = [
    mk({ id: "rent", description: "Alquiler", amount: 800 }),
    mk({ id: "gym", description: "Gimnasio", amount: 40 }),
    mk({ id: "phone", description: "Móvil", amount: 100, startDate: "2026-10-01", endDate: "2026-12-31" }),
    mk({ id: "sofa", description: "Sofá", amount: 50, startDate: "2026-11-01", endDate: "2027-04-30" }),
    mk({ id: "done", description: "Viejo", amount: 30, startDate: "2026-01-01", endDate: "2026-03-31" }),
    mk({ id: "usd", description: "En dólares", amount: 30, currency: "USD", endDate: "2027-01-31" }),
    mk({ id: "off", description: "Pausado", amount: 30, active: false, endDate: "2027-01-31" }),
  ];

  it("separates what ends from what doesn't and totals what's left", () => {
    const s = summarizeCommitments(recurring, "EUR", TODAY);
    expect(s.finite.map((c) => c.id)).toEqual(["phone", "sofa"]);
    expect(s.indefinite.map((c) => c.id)).toEqual(["rent", "gym"]);
    // Móvil: Nov + Dec = 200. Sofá: Nov..Apr = 6 × 50 = 300.
    expect(s.remainingTotal).toBe(500);
    expect(s.remainingPayments).toBe(8);
    expect(s.lastMonth).toBe("2027-04");
    expect(s.indefiniteMonthly).toBe(840);
  });

  it("with nothing that ends, there's no last month", () => {
    const s = summarizeCommitments([recurring[0]], "EUR", TODAY);
    expect(s.finite).toEqual([]);
    expect(s.lastMonth).toBeNull();
    expect(s.remainingTotal).toBe(0);
  });
});

describe("fixedOutlook", () => {
  it("shows the monthly cost stepping down as plans finish", () => {
    const recurring = [
      mk({ id: "rent", description: "Alquiler", amount: 800 }),
      mk({ id: "phone", description: "Móvil", amount: 100, startDate: "2026-10-01", endDate: "2026-12-31" }),
    ];
    const outlook = fixedOutlook(recurring, "EUR", TODAY, 3);
    expect(outlook.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(outlook.map((m) => m.total)).toEqual([900, 900, 800]);
    expect(outlook[0].ending).toEqual([]);
    expect(outlook[1].ending).toEqual(["Móvil"]);
    expect(outlook[2]).toMatchObject({ indefinite: 800, finite: 0 });
  });

  it("puts a yearly payment in its own month", () => {
    const outlook = fixedOutlook([mk({ periodicity: "yearly", amount: 60, startDate: "2026-02-10" })], "EUR", TODAY, 4);
    expect(outlook.map((m) => m.total)).toEqual([0, 0, 0, 60]);
  });
});

describe("monthsUntil", () => {
  it("counts whole months across a year boundary", () => {
    expect(monthsUntil("2026-11", "2026-11")).toBe(0);
    expect(monthsUntil("2026-11", "2027-02")).toBe(3);
  });
});
