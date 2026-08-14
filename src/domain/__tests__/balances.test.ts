import { describe, expect, it } from "vitest";
import { computeBalances } from "../balances";
import type { GroupExpense, Payment } from "../../types";

function expense(partial: Partial<GroupExpense>): GroupExpense {
  return {
    id: partial.id ?? "e1",
    groupId: "g1",
    createdBy: partial.paidBy ?? "carlos",
    paidBy: "carlos",
    amount: 0,
    currency: "EUR",
    description: "test",
    categoryId: "otros",
    date: "2026-01-01",
    splitMethod: "equal",
    participants: [],
    splits: [],
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe("computeBalances", () => {
  it("matches the worked example from the spec", () => {
    // Carlos pagó 200, Laura pagó 50, Miguel pagó 0. Total 250, partes iguales entre 3 -> 83.33 c/u.
    const expenses: GroupExpense[] = [
      expense({
        id: "e1",
        paidBy: "carlos",
        amount: 200,
        participants: ["carlos", "laura", "miguel"],
        splits: [
          { uid: "carlos", amount: 66.67 },
          { uid: "laura", amount: 66.67 },
          { uid: "miguel", amount: 66.66 },
        ],
      }),
      expense({
        id: "e2",
        paidBy: "laura",
        amount: 50,
        participants: ["carlos", "laura", "miguel"],
        splits: [
          { uid: "carlos", amount: 16.67 },
          { uid: "laura", amount: 16.67 },
          { uid: "miguel", amount: 16.66 },
        ],
      }),
    ];

    const balances = computeBalances(["carlos", "laura", "miguel"], expenses, [], "EUR");
    const byUid = Object.fromEntries(balances.map((b) => [b.uid, b]));

    expect(byUid.carlos.paid).toBe(200);
    expect(byUid.carlos.owed).toBeCloseTo(83.34, 2);
    expect(byUid.carlos.net).toBeCloseTo(116.66, 2);

    expect(byUid.laura.net).toBeCloseTo(-33.34, 2);
    expect(byUid.miguel.net).toBeCloseTo(-83.32, 2);

    // Balances always net to (near) zero.
    const total = balances.reduce((s, b) => s + b.net, 0);
    expect(total).toBeCloseTo(0, 2);
  });

  it("ignores deleted expenses", () => {
    const expenses: GroupExpense[] = [
      expense({
        paidBy: "a",
        amount: 100,
        deleted: true,
        splits: [{ uid: "a", amount: 100 }],
      }),
    ];
    const balances = computeBalances(["a", "b"], expenses, [], "EUR");
    expect(balances.every((b) => b.net === 0)).toBe(true);
  });

  it("confirmed payments reduce debt; pending payments do not", () => {
    const expenses: GroupExpense[] = [
      expense({
        paidBy: "a",
        amount: 100,
        splits: [
          { uid: "a", amount: 50 },
          { uid: "b", amount: 50 },
        ],
      }),
    ];

    const pendingPayment: Payment = {
      id: "p1",
      groupId: "g1",
      fromUid: "b",
      toUid: "a",
      amount: 50,
      currency: "EUR",
      status: "pending",
      createdBy: "b",
      createdAt: 0,
    };

    const withPending = computeBalances(["a", "b"], expenses, [pendingPayment], "EUR");
    expect(withPending.find((b) => b.uid === "b")?.net).toBe(-50);

    const confirmedPayment: Payment = { ...pendingPayment, status: "confirmed" };
    const withConfirmed = computeBalances(["a", "b"], expenses, [confirmedPayment], "EUR");
    expect(withConfirmed.find((b) => b.uid === "b")?.net).toBe(0);
    expect(withConfirmed.find((b) => b.uid === "a")?.net).toBe(0);
  });

  it("ignores reverted (deleted) payments", () => {
    const expenses: GroupExpense[] = [
      expense({ paidBy: "a", amount: 100, splits: [{ uid: "a", amount: 50 }, { uid: "b", amount: 50 }] }),
    ];
    const reverted: Payment = {
      id: "p1",
      groupId: "g1",
      fromUid: "b",
      toUid: "a",
      amount: 50,
      currency: "EUR",
      status: "confirmed",
      deleted: true,
      createdBy: "b",
      createdAt: 0,
    };
    const balances = computeBalances(["a", "b"], expenses, [reverted], "EUR");
    expect(balances.find((b) => b.uid === "b")?.net).toBe(-50);
  });
});
