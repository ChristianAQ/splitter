import { useEffect, useMemo, useState } from "react";
import { subscribeGroupExpenses } from "../services/expenses.service";
import type { Group, GroupExpense } from "../types";

/**
 * Sums the signed-in user's own split share (not what they paid — what they
 * actually owe for it) across every group's expenses, bucketed by month and
 * then by currency. Groups can each use a different currency and this app
 * has no exchange-rate conversion anywhere, so callers pick the currency
 * bucket matching whatever they're already displaying.
 *
 * Subscribes once per group (unfiltered — there's no date range in the
 * query) and refilters client-side per `months`, so changing which months a
 * caller cares about is a plain recompute, not new listeners.
 */
export function useGroupsMonthlySpend(groups: Group[], uid: string | undefined, months: string[]) {
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

  const monthsKey = months.join(",");

  return useMemo(() => {
    const monthSet = new Set(months);
    const byMonth: Record<string, Record<string, number>> = {};
    for (const group of groups) {
      for (const e of expensesByGroup[group.id] ?? []) {
        const key = e.date.slice(0, 7);
        if (!monthSet.has(key)) continue;
        const share = e.splits.find((s) => s.uid === uid)?.amount ?? 0;
        const forMonth = (byMonth[key] ??= {});
        forMonth[group.currency] = (forMonth[group.currency] ?? 0) + share;
      }
    }
    return byMonth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, expensesByGroup, uid, monthsKey]);
}
