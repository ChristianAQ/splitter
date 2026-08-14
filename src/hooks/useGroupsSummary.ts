import { useEffect, useState } from "react";
import { subscribeGroupExpenses } from "../services/expenses.service";
import { subscribeGroupPayments } from "../services/payments.service";
import { subscribeMembers } from "../services/groups.service";
import { computeBalances } from "../domain/balances";
import type { Group } from "../types";

export interface GroupSummary {
  balance: number;
}

/** Per-group "my balance" for dashboard/group-list cards. Runs one set of
 * subscriptions per visible group — fine at the scale of a personal splitting
 * app (a handful of groups), and each group's balance recomputes locally
 * from its own expenses/payments/members without extra reads elsewhere. */
export function useGroupsSummary(groups: Group[], uid: string | undefined) {
  const [summaries, setSummaries] = useState<Record<string, GroupSummary>>({});

  useEffect(() => {
    if (!uid || groups.length === 0) {
      setSummaries({});
      return;
    }

    const state: Record<string, { members: string[]; expenses: Parameters<typeof computeBalances>[1]; payments: Parameters<typeof computeBalances>[2] }> = {};

    function recompute(groupId: string, currency: string) {
      const s = state[groupId];
      if (!s) return;
      const balances = computeBalances(s.members, s.expenses, s.payments, currency);
      const mine = balances.find((b) => b.uid === uid);
      setSummaries((prev) => ({ ...prev, [groupId]: { balance: mine?.net ?? 0 } }));
    }

    const unsubs = groups.flatMap((group) => {
      state[group.id] = { members: [], expenses: [], payments: [] };
      return [
        subscribeMembers(group.id, (members) => {
          state[group.id].members = members.filter((m) => m.active).map((m) => m.uid);
          recompute(group.id, group.currency);
        }),
        subscribeGroupExpenses(group.id, (expenses) => {
          state[group.id].expenses = expenses;
          recompute(group.id, group.currency);
        }),
        subscribeGroupPayments(group.id, (payments) => {
          state[group.id].payments = payments;
          recompute(group.id, group.currency);
        }),
      ];
    });

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, groups.map((g) => g.id).join(",")]);

  return summaries;
}
