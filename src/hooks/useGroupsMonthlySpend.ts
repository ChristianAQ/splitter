import { useEffect, useMemo, useState } from "react";
import { subscribeGroupExpenses } from "../services/expenses.service";
import type { Group, GroupExpense } from "../types";

/**
 * Sums the signed-in user's own split share (not what they paid — what they
 * actually owe for it) across every group's expenses for the given month,
 * bucketed by currency. Groups can each use a different currency and this
 * app has no exchange-rate conversion anywhere, so callers pick the bucket
 * matching whatever currency they're already displaying.
 *
 * Subscribes once per group (unfiltered — there's no date range in the
 * query) and refilters client-side per `month`, so switching the month a
 * caller is looking at is a plain recompute, not new listeners.
 */
export function useGroupsMonthlySpend(groups: Group[], uid: string | undefined, month: string) {
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, GroupExpense[]>>({});

  useEffect(() => {
    if (!uid || groups.length === 0) {
      setExpensesByGroup({});
      return;
    }

    const unsubs = groups.map((group) =>
      subscribeGroupExpenses(group.id, (expenses) => {
        setExpensesByGroup((prev) => ({ ...prev, [group.id]: expenses }));
      })
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, groups.map((g) => g.id).join(",")]);

  return useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const group of groups) {
      const spend = (expensesByGroup[group.id] ?? [])
        .filter((e) => e.date.slice(0, 7) === month)
        .reduce((sum, e) => sum + (e.splits.find((s) => s.uid === uid)?.amount ?? 0), 0);
      byCurrency[group.currency] = (byCurrency[group.currency] ?? 0) + spend;
    }
    return byCurrency;
  }, [groups, expensesByGroup, uid, month]);
}
