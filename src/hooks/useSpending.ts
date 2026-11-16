import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { usePersonalExpenses } from "./usePersonalExpenses";
import { useGroups } from "./useGroups";
import { useGroupsMonthlySpend } from "./useGroupsMonthlySpend";
import { summarizeSpending } from "../domain/spending";
import { shiftMonth, todayISO } from "../domain/date";
import { GROUPS_CATEGORY } from "../lib/categories";
import type { Currency } from "../types";

/**
 * Spending for the last `monthCount` months (oldest first, ending with the
 * current one), by the app's single definition of "spent" — see
 * domain/spending.ts. Shared by Inicio and Estadísticas so the two can't
 * show different numbers for the same month.
 */
export function useSpending(monthCount = 6) {
  const { profile } = useAuth();
  const { expenses, loading } = usePersonalExpenses();
  const { groups, archivedGroups } = useGroups();
  const currency: Currency = profile?.currency ?? "EUR";
  const today = todayISO();
  const thisMonth = today.slice(0, 7);

  const months = useMemo(() => Array.from({ length: monthCount }, (_, i) => shiftMonth(thisMonth, i - (monthCount - 1))), [thisMonth, monthCount]);
  // An archived group's past expenses still happened: they keep counting
  // in the month they occurred.
  const allGroups = useMemo(() => [...groups, ...archivedGroups], [groups, archivedGroups]);
  const groupsByMonth = useGroupsMonthlySpend(allGroups, profile?.uid, months);

  const summary = useMemo(() => {
    const share: Record<string, number> = {};
    for (const m of months) share[m] = groupsByMonth[m]?.[currency] ?? 0;
    return summarizeSpending(expenses, share, months, GROUPS_CATEGORY.id);
  }, [expenses, groupsByMonth, months, currency]);

  return { summary, expenses, loading, currency, today, thisMonth };
}
