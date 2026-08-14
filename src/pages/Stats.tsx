import { useMemo, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { BarChart } from "../components/charts/BarChart";
import { CategoryBreakdown } from "../components/charts/CategoryBreakdown";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useGroups } from "../hooks/useGroups";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { formatCurrency, formatMonth } from "../lib/format";
import { todayISO } from "../domain/date";

type Scope = "personal" | string;

function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const cursor = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function Stats() {
  const { profile } = useAuth();
  const { groups } = useGroups();
  const [scope, setScope] = useState<Scope>("personal");

  return (
    <>
      <TopBar title="Estadísticas" />
      <PageContainer>
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setScope("personal")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              scope === "personal" ? "bg-accent text-white" : "bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            Personal
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setScope(g.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                scope === g.id ? "bg-accent text-white" : "bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>

        {scope === "personal" ? <PersonalStats currency={profile?.currency ?? "EUR"} /> : <GroupStats groupId={scope} />}
      </PageContainer>
    </>
  );
}

function PersonalStats({ currency }: { currency: "EUR" | "USD" | "GBP" }) {
  const { expenses, loading } = usePersonalExpenses();

  const { bars, categorySlices, average, thisMonthTotal } = useMemo(() => {
    const months = lastNMonths(6);
    const totals = new Map(months.map((m) => [m, 0]));
    const byCategory: Record<string, number> = {};
    const thisMonth = todayISO().slice(0, 7);
    let thisTotal = 0;

    for (const e of expenses) {
      if (e.status === "future") continue;
      const key = e.date.slice(0, 7);
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + e.amount);
      if (key === thisMonth) {
        thisTotal += e.amount;
        byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
      }
    }

    const values = Array.from(totals.values());
    const nonZeroMonths = values.filter((v) => v > 0).length || 1;
    const avg = values.reduce((s, v) => s + v, 0) / nonZeroMonths;

    return {
      bars: months.map((m) => ({ label: formatMonth(`${m}-01`).slice(0, 3), value: totals.get(m) ?? 0 })),
      categorySlices: Object.entries(byCategory).map(([categoryId, amount]) => ({ categoryId, amount })),
      average: avg,
      thisMonthTotal: thisTotal,
    };
  }, [expenses]);

  if (!loading && expenses.length === 0) {
    return <EmptyState icon="📊" title="Sin datos todavía" description="Añade gastos para ver tus estadísticas." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">Últimos 6 meses</p>
        <BarChart bars={bars} formatValue={(v) => formatCurrency(v, currency)} />
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Este mes</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(thisMonthTotal, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Media mensual</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(average, currency)}</p>
        </Card>
      </div>
      {categorySlices.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">Por categoría (este mes)</p>
          <CategoryBreakdown slices={categorySlices} currency={currency} />
        </Card>
      )}
    </div>
  );
}

function GroupStats({ groupId }: { groupId: string }) {
  const { group, activeMembers, expenses, balances, loading } = useGroupDetail(groupId);

  const { categorySlices, paidByMember, mostActive } = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const paid = new Map(activeMembers.map((m) => [m.uid, 0]));
    const count = new Map(activeMembers.map((m) => [m.uid, 0]));

    for (const e of expenses) {
      byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount);
      count.set(e.createdBy, (count.get(e.createdBy) ?? 0) + 1);
    }

    const mostActiveEntry = Array.from(count.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      categorySlices: Object.entries(byCategory).map(([categoryId, amount]) => ({ categoryId, amount })),
      paidByMember: activeMembers.map((m) => ({ member: m, amount: paid.get(m.uid) ?? 0 })).sort((a, b) => b.amount - a.amount),
      mostActive: mostActiveEntry ? activeMembers.find((m) => m.uid === mostActiveEntry[0]) : undefined,
    };
  }, [expenses, activeMembers]);

  if (loading || !group) return null;
  if (expenses.length === 0) return <EmptyState icon="📊" title="Sin gastos todavía" />;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Gasto total</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(total, group.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Gasto medio / persona</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatCurrency(total / Math.max(1, activeMembers.length), group.currency)}
          </p>
        </Card>
      </div>

      {mostActive && (
        <Card className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-semibold">{mostActive.name} ha añadido más gastos</p>
            <p className="text-xs text-neutral-400">Quien más aporta al registro del grupo</p>
          </div>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Gasto por persona</p>
        <div className="flex flex-col gap-2">
          {paidByMember.map(({ member, amount }) => (
            <div key={member.uid} className="flex items-center justify-between text-sm">
              <span className="font-medium">{member.name}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(amount, group.currency)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">Por categoría</p>
        <CategoryBreakdown slices={categorySlices} currency={group.currency} />
      </Card>

      <Card>
        <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Balances</p>
        <div className="flex flex-col gap-1.5 text-sm">
          {balances.map((b) => {
            const m = activeMembers.find((x) => x.uid === b.uid);
            if (!m) return null;
            return (
              <div key={b.uid} className="flex items-center justify-between">
                <span>{m.name}</span>
                <span className={`font-semibold tabular-nums ${b.net >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatCurrency(b.net, group.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
