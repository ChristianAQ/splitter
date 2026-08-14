import { describe, expect, it } from "vitest";
import { optimizeSettlement } from "../settlement";
import { computeBalances } from "../balances";
import type { GroupExpense, MemberBalance } from "../../types";

describe("optimizeSettlement", () => {
  it("produces the two transfers from the spec example", () => {
    const balances: MemberBalance[] = [
      { uid: "carlos", paid: 200, owed: 83.34, net: 116.66 },
      { uid: "laura", paid: 50, owed: 83.34, net: -33.34 },
      { uid: "miguel", paid: 0, owed: 83.32, net: -83.32 },
    ];
    const transfers = optimizeSettlement(balances, "EUR");
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual(
      expect.arrayContaining([
        { fromUid: "laura", toUid: "carlos", amount: 33.34 },
        { fromUid: "miguel", toUid: "carlos", amount: 83.32 },
      ])
    );
  });

  it("uses at most n-1 transfers for n members with nonzero balances", () => {
    const balances: MemberBalance[] = [
      { uid: "a", paid: 0, owed: 0, net: 40 },
      { uid: "b", paid: 0, owed: 0, net: 30 },
      { uid: "c", paid: 0, owed: 0, net: -20 },
      { uid: "d", paid: 0, owed: 0, net: -50 },
    ];
    const transfers = optimizeSettlement(balances, "EUR");
    expect(transfers.length).toBeLessThanOrEqual(3);
    const netAfter = new Map(balances.map((b) => [b.uid, b.net]));
    for (const t of transfers) {
      netAfter.set(t.fromUid, (netAfter.get(t.fromUid) ?? 0) + t.amount);
      netAfter.set(t.toUid, (netAfter.get(t.toUid) ?? 0) - t.amount);
    }
    for (const net of netAfter.values()) expect(net).toBeCloseTo(0, 2);
  });

  it("returns no transfers when everyone is already settled", () => {
    const balances: MemberBalance[] = [
      { uid: "a", paid: 50, owed: 50, net: 0 },
      { uid: "b", paid: 50, owed: 50, net: 0 },
    ];
    expect(optimizeSettlement(balances, "EUR")).toEqual([]);
  });

  it("ignores sub-cent noise via the epsilon threshold", () => {
    const balances: MemberBalance[] = [
      { uid: "a", paid: 0, owed: 0, net: 0.001 },
      { uid: "b", paid: 0, owed: 0, net: -0.001 },
    ];
    expect(optimizeSettlement(balances, "EUR")).toEqual([]);
  });

  it("end-to-end: expenses -> balances -> settlement always nets to zero for random-ish data", () => {
    const members = ["a", "b", "c", "d", "e"];
    const expenses: GroupExpense[] = [
      mkExpense("e1", "a", 137.5, ["a", "b", "c"]),
      mkExpense("e2", "b", 42.1, ["a", "b", "c", "d", "e"]),
      mkExpense("e3", "e", 9.99, ["d", "e"]),
      mkExpense("e4", "c", 500, members),
    ];
    const balances = computeBalances(members, expenses, [], "EUR");
    const transfers = optimizeSettlement(balances, "EUR");

    const netAfter = new Map(balances.map((b) => [b.uid, b.net]));
    for (const t of transfers) {
      netAfter.set(t.fromUid, (netAfter.get(t.fromUid) ?? 0) + t.amount);
      netAfter.set(t.toUid, (netAfter.get(t.toUid) ?? 0) - t.amount);
    }
    for (const net of netAfter.values()) expect(Math.abs(net)).toBeLessThan(0.02);
    // every transfer amount must be positive
    expect(transfers.every((t) => t.amount > 0)).toBe(true);
  });
});

function mkExpense(id: string, paidBy: string, amount: number, participants: string[]): GroupExpense {
  const share = Math.round((amount / participants.length) * 100) / 100;
  const splits = participants.map((uid, i) => ({
    uid,
    amount: i === 0 ? Math.round((amount - share * (participants.length - 1)) * 100) / 100 : share,
  }));
  return {
    id,
    groupId: "g1",
    createdBy: paidBy,
    paidBy,
    amount,
    currency: "EUR",
    description: id,
    categoryId: "otros",
    date: "2026-01-01",
    splitMethod: "equal",
    participants,
    splits,
    createdAt: 0,
    updatedAt: 0,
  };
}
