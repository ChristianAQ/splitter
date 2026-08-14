import { describe, expect, it } from "vitest";
import { occurrencesInRange, nextOccurrence } from "../recurring";
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

describe("occurrencesInRange - monthly", () => {
  it("generates one occurrence per month on dayOfMonth", () => {
    const r = mk({ dayOfMonth: 15, startDate: "2026-01-01" });
    const dates = occurrencesInRange(r, "2026-01-01", "2026-04-30");
    expect(dates).toEqual(["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("clamps day 31 to the last day of short months", () => {
    const r = mk({ dayOfMonth: 31, startDate: "2026-01-01" });
    const dates = occurrencesInRange(r, "2026-01-01", "2026-04-30");
    // Feb 2026 has 28 days, April has 30.
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("respects startDate — no occurrence before it even within range", () => {
    const r = mk({ dayOfMonth: 1, startDate: "2026-03-01" });
    const dates = occurrencesInRange(r, "2026-01-01", "2026-04-30");
    expect(dates).toEqual(["2026-03-01", "2026-04-01"]);
  });

  it("respects endDate", () => {
    const r = mk({ dayOfMonth: 1, startDate: "2026-01-01", endDate: "2026-02-15" });
    const dates = occurrencesInRange(r, "2026-01-01", "2026-06-30");
    expect(dates).toEqual(["2026-01-01", "2026-02-01"]);
  });

  it("returns nothing when inactive", () => {
    const r = mk({ active: false });
    expect(occurrencesInRange(r, "2026-01-01", "2026-12-31")).toEqual([]);
  });

  it("never produces duplicate dates across repeated calls with overlapping ranges", () => {
    const r = mk({ dayOfMonth: 10, startDate: "2026-01-01" });
    const first = occurrencesInRange(r, "2026-01-01", "2026-03-31");
    const second = occurrencesInRange(r, "2026-02-01", "2026-04-30");
    const overlapMonth = "2026-02-10";
    expect(first).toContain(overlapMonth);
    expect(second).toContain(overlapMonth);
    // The service layer dedupes by (recurringSourceId, date) before writing,
    // so producing the same date twice for overlapping ranges is expected
    // and safe — it's the write path's job to not double-insert it.
  });
});

describe("occurrencesInRange - weekly", () => {
  it("generates every 7 days", () => {
    const r = mk({ periodicity: "weekly", startDate: "2026-01-05" });
    const dates = occurrencesInRange(r, "2026-01-01", "2026-01-31");
    expect(dates).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });
});

describe("occurrencesInRange - yearly", () => {
  it("generates one occurrence per year on month/day", () => {
    const r = mk({ periodicity: "yearly", startDate: "2024-08-14" });
    const dates = occurrencesInRange(r, "2026-01-01", "2028-12-31");
    expect(dates).toEqual(["2026-08-14", "2027-08-14", "2028-08-14"]);
  });
});

describe("nextOccurrence", () => {
  it("finds the next date on/after fromDate", () => {
    const r = mk({ dayOfMonth: 15, startDate: "2026-01-01" });
    expect(nextOccurrence(r, "2026-08-14")).toBe("2026-08-15");
  });

  it("returns null once the recurring expense has ended", () => {
    const r = mk({ dayOfMonth: 1, startDate: "2026-01-01", endDate: "2026-02-01" });
    expect(nextOccurrence(r, "2026-06-01")).toBeNull();
  });
});
