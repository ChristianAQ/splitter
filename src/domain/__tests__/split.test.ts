import { describe, expect, it } from "vitest";
import { splitByAmount, splitEqual } from "../split";

describe("splitEqual", () => {
  it("splits evenly when it divides cleanly", () => {
    const result = splitEqual(120, "EUR", ["a", "b", "c"]);
    expect(result.ok).toBe(true);
    expect(result.splits).toEqual([
      { uid: "a", amount: 40 },
      { uid: "b", amount: 40 },
      { uid: "c", amount: 40 },
    ]);
  });

  it("distributes the leftover cent(s) instead of dropping them", () => {
    const result = splitEqual(100, "EUR", ["a", "b", "c"]);
    expect(result.ok).toBe(true);
    const total = result.splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(10000);
    // 100 / 3 = 33.33.. -> 33.34, 33.33, 33.33
    expect(result.splits[0].amount).toBeCloseTo(33.34, 2);
    expect(result.splits[1].amount).toBeCloseTo(33.33, 2);
    expect(result.splits[2].amount).toBeCloseTo(33.33, 2);
  });

  it("handles a single participant", () => {
    const result = splitEqual(59.99, "EUR", ["a"]);
    expect(result.splits).toEqual([{ uid: "a", amount: 59.99 }]);
  });

  it("dedupes repeated participant ids", () => {
    const result = splitEqual(100, "EUR", ["a", "a", "b"]);
    expect(result.splits).toHaveLength(2);
  });

  it("rejects an empty participant list", () => {
    const result = splitEqual(100, "EUR", []);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("no_participants");
  });

  it("never loses or gains a cent across many participant counts", () => {
    for (let n = 1; n <= 11; n += 1) {
      const ids = Array.from({ length: n }, (_, i) => `u${i}`);
      const result = splitEqual(100.01, "EUR", ids);
      const totalMinor = result.splits.reduce((s, x) => s + Math.round(x.amount * 100), 0);
      expect(totalMinor).toBe(10001);
    }
  });
});

describe("splitByAmount", () => {
  it("accepts amounts that sum exactly to the total", () => {
    const result = splitByAmount(120, "EUR", { a: 60, b: 30, c: 30 });
    expect(result.ok).toBe(true);
    expect(result.splits).toHaveLength(3);
  });

  it("rejects amounts that don't sum to the total", () => {
    const result = splitByAmount(120, "EUR", { a: 60, b: 30, c: 29.99 });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("amount_mismatch");
  });

  it("tolerates float noise via minor-unit comparison", () => {
    // 0.1 + 0.2 !== 0.3 in IEEE754 — must still validate correctly.
    const result = splitByAmount(0.3, "EUR", { a: 0.1, b: 0.2 });
    expect(result.ok).toBe(true);
  });

  it("rejects negative shares", () => {
    const result = splitByAmount(100, "EUR", { a: 150, b: -50 });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("negative_share");
  });

  it("drops zero-amount participants from the persisted splits", () => {
    const result = splitByAmount(100, "EUR", { a: 100, b: 0 });
    expect(result.ok).toBe(true);
    expect(result.splits).toEqual([{ uid: "a", amount: 100 }]);
  });

  it("rejects an empty amounts map", () => {
    const result = splitByAmount(100, "EUR", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("no_participants");
  });
});
