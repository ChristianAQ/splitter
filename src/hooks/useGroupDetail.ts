import { useEffect, useMemo, useState } from "react";
import { subscribeGroup, subscribeMembers } from "../services/groups.service";
import { subscribeGroupExpenses } from "../services/expenses.service";
import { subscribeGroupPayments } from "../services/payments.service";
import { subscribeGroupHistory } from "../services/history.service";
import { computeBalances } from "../domain/balances";
import { optimizeSettlement } from "../domain/settlement";
import type { Group, GroupExpense, GroupMember, HistoryEntry, Payment } from "../types";

/** One realtime subscription hook for everything a group detail screen
 * needs, with balances/settlement recomputed client-side whenever the
 * underlying data changes — cheap pure functions, no extra reads. */
export function useGroupDetail(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    setNotFound(false);
    const unsubs = [
      subscribeGroup(
        groupId,
        (g) => {
          setGroup(g);
          if (g === null) setNotFound(true);
          setLoading(false);
        },
        () => {
          // Permission-denied (removed from the group, or a stale/invalid
          // link) surfaces the same "no access" state as a missing group —
          // never leave the screen stuck on the loading skeleton forever.
          setGroup(null);
          setNotFound(true);
          setLoading(false);
        }
      ),
      subscribeMembers(groupId, setMembers),
      subscribeGroupExpenses(groupId, setExpenses),
      subscribeGroupPayments(groupId, setPayments),
      subscribeGroupHistory(groupId, setHistory),
    ];
    return () => unsubs.forEach((u) => u());
  }, [groupId]);

  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  const balances = useMemo(() => {
    if (!group) return [];
    return computeBalances(
      activeMembers.map((m) => m.uid),
      expenses,
      payments,
      group.currency
    );
  }, [group, activeMembers, expenses, payments]);

  const settlement = useMemo(() => {
    if (!group) return [];
    return optimizeSettlement(balances, group.currency);
  }, [group, balances]);

  return { group, members, activeMembers, expenses, payments, history, balances, settlement, loading, notFound };
}
