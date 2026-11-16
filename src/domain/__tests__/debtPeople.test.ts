import { describe, expect, it } from "vitest";
import { balancesByPerson, netTotals, payTowards, personKey, settleAllWith } from "../debtPeople";
import type { Debt } from "../../types";

const TODAY = "2026-11-16";
const debt = (o: Partial<Debt>): Debt => ({
  id: "d", ownerId: "me", kind: "owe", person: "Marta", amount: 100, paidAmount: 0, currency: "EUR",
  date: "2026-11-01", createdAt: 0, updatedAt: 0, ...o,
});

describe("personKey", () => {
  it("ignores case, accents and stray spaces", () => {
    expect(personKey("  José  Luis ")).toBe(personKey("jose luis"));
    expect(personKey("Ana")).not.toBe(personKey("Anna"));
  });
});

describe("balancesByPerson", () => {
  const people = balancesByPerson(
    [
      debt({ id: "a", amount: 300, createdAt: 1 }),
      debt({ id: "b", kind: "owed", person: "marta", amount: 100, createdAt: 2 }),
      debt({ id: "c", amount: 50, paidAmount: 20, person: "MARTA ", dueDate: "2026-11-10", createdAt: 3 }),
      debt({ id: "d", kind: "owed", person: "Jorge", amount: 45 }),
      debt({ id: "e", person: "Jorge", amount: 999, settledAt: 1 }),
      debt({ id: "f", kind: "owed", person: "Luis", amount: 20, dueDate: "2026-12-01" }),
    ],
    TODAY
  );

  it("nets everything open with the same person into one figure", () => {
    const marta = people.find((p) => p.name === "Marta")!;
    expect([marta.iOwe, marta.owedToMe, marta.net]).toEqual([330, 100, -230]);
    expect(marta.debts.map((d) => d.id)).toEqual(["c", "a", "b"]); // the one with a deadline first
    expect(marta.overdue).toBe(true);
  });
  it("writes the name the way it's spelled most, preferring capitals", () => {
    const [p] = balancesByPerson([debt({ id: "1", person: "marta" }), debt({ id: "2", person: "Marta " })], TODAY);
    expect(p.name).toBe("Marta");
  });
  it("leaves settled debts out", () => {
    expect(people.find((p) => p.name === "Jorge")!.net).toBe(45);
  });
  it("puts the most pressing deadline first, then the largest amounts", () => {
    expect(people.map((p) => p.name)).toEqual(["Marta", "Luis", "Jorge"]);
  });
  it("totals what I owe and am owed after netting", () => {
    expect(netTotals(people, "EUR")).toEqual({ iOwe: 230, owedToMe: 65 });
  });
});

describe("paying a person", () => {
  const person = () =>
    balancesByPerson(
      [
        debt({ id: "old", amount: 300, date: "2026-10-01" }),
        debt({ id: "due", amount: 50, dueDate: "2026-11-20" }),
        debt({ id: "theirs", kind: "owed", amount: 100 }),
      ],
      TODAY
    )[0];

  it("settling pays off every open debt, both ways", () => {
    const updates = settleAllWith(person(), TODAY, 1);
    expect(updates.map((u) => [u.debt.id, u.progress.settled])).toEqual([
      ["due", true],
      ["old", true],
      ["theirs", true],
    ]);
  });
  it("a partial payment goes to my debts, most urgent first, and never touches theirs", () => {
    const updates = payTowards(person(), 80, TODAY, 1); // net is -250
    expect(updates.map((u) => [u.debt.id, u.progress.paidAmount, u.progress.settled])).toEqual([
      ["due", 50, true],
      ["old", 30, false],
    ]);
  });
  it("paying the full net settles everything", () => {
    expect(payTowards(person(), 250, TODAY, 1)).toHaveLength(3);
    expect(payTowards(person(), 250, TODAY, 1).every((u) => u.progress.settled)).toBe(true);
  });
  it("when they owe me on balance, a partial payment reduces their debts", () => {
    const p = balancesByPerson([debt({ id: "x", kind: "owed", amount: 100 }), debt({ id: "y", amount: 30 })], TODAY)[0];
    expect(payTowards(p, 40, TODAY, 1).map((u) => [u.debt.id, u.progress.paidAmount])).toEqual([["x", 40]]);
  });
});
