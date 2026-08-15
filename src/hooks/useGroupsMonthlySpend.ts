import { useEffect, useState } from "react";
import { subscribeGroupExpenses } from "../services/expenses.service";
import { todayISO } from "../domain/date";
import type { Group } from "../types";

/**
 * Sums the signed-in user's own split share (not what they paid — what they
 * actually owe for it) across every group's expenses for the current month,
 * bucketed by currency. Groups can each use a different currency and this
 * app has no exchange-rate conversion anywhere, so callers pick the bucket
 * matching whatever currency they're already displaying.
 */
export function useGroupsMonthlySpend(groups: Group[], uid: string | undefined) {
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!uid || groups.length === 0) {
      setTotals({});
      return;
    }

    const thisMonth = todayISO().slice(0, 7);
    const perGroup: Record<string, number> = {};

    function recompute() {
      const byCurrency: Record<string, number> = {};
      for (const group of groups) {
        byCurrency[group.currency] = (byCurrency[group.currency] ?? 0) + (perGroup[group.id] ?? 0);
      }
      setTotals(byCurrency);
    }

    const unsubs = groups.map((group) =>
      subscribeGroupExpenses(group.id, (expenses) => {
        perGroup[group.id] = expenses
          .filter((e) => e.date.slice(0, 7) === thisMonth)
          .reduce((sum, e) => sum + (e.splits.find((s) => s.uid === uid)?.amount ?? 0), 0);
        recompute();
      })
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, groups.map((g) => g.id).join(",")]);

  return totals;
}
