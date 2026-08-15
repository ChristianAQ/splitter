import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { GroupCard } from "../components/group/GroupCard";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { OfflineBanner } from "../components/ui/ErrorState";
import { useAuth } from "../context/AuthContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useGroups } from "../hooks/useGroups";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { formatCurrency, formatMonth } from "../lib/format";
import { categoryById } from "../lib/categories";
import { todayISO } from "../domain/date";

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function Home() {
  const { profile } = useAuth();
  const online = useOnlineStatus();
  const { expenses, loading } = usePersonalExpenses();
  const { groups, loading: groupsLoading } = useGroups();
  const summaries = useGroupsSummary(groups, profile?.uid);

  const currency = profile?.currency ?? "EUR";
  const today = todayISO();
  const thisMonth = monthKey(today);
  const lastMonthDate = new Date(today);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const { thisMonthTotal, lastMonthTotal, topCategory, upcoming } = useMemo(() => {
    let thisTotal = 0;
    let lastTotal = 0;
    const byCategory: Record<string, number> = {};

    for (const e of expenses) {
      if (e.status === "future") continue;
      if (monthKey(e.date) === thisMonth) {
        thisTotal += e.amount;
        byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
      } else if (monthKey(e.date) === lastMonth) {
        lastTotal += e.amount;
      }
    }

    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const upcomingList = expenses.filter((e) => e.status === "future").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

    return { thisMonthTotal: thisTotal, lastMonthTotal: lastTotal, topCategory: top, upcoming: upcomingList };
  }, [expenses, thisMonth, lastMonth]);

  const delta = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;

  return (
    <>
      {!online && <OfflineBanner />}
      <PageContainer>
        <header className="pb-4 pt-[calc(env(safe-area-inset-top)+18px)]">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Hola{profile ? `, ${profile.name.split(" ")[0]}` : ""} 👋</p>
          <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Este mes</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(thisMonthTotal, currency)}</p>
            {delta !== null && (
              <p className={`mt-0.5 text-xs font-medium ${delta <= 0 ? "text-positive" : "text-negative"}`}>
                {delta <= 0 ? "▼" : "▲"} {Math.abs(Math.round(delta))}% vs. mes anterior
              </p>
            )}
          </Card>
          <Card>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Mes anterior</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(lastMonthTotal, currency)}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-400">{formatMonth(`${lastMonth}-01`)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Categoría top</p>
            {topCategory ? (
              <>
                <p className="mt-1 text-xl font-bold">{categoryById(topCategory[0]).icon}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{categoryById(topCategory[0]).label}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-neutral-400">Sin datos</p>
            )}
          </Card>
          <Card>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Próximos gastos</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{upcoming.length}</p>
            <p className="mt-0.5 text-xs text-neutral-400">pendientes</p>
          </Card>
        </section>

        {upcoming.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Próximamente</h2>
            <div className="flex flex-col gap-2">
              {upcoming.map((e) => (
                <Card key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{categoryById(e.categoryId).icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{e.description}</p>
                      <p className="text-xs text-neutral-400">{e.date}</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{formatCurrency(e.amount, e.currency)}</span>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Grupos</h2>
            <Link to="/grupos" className="text-sm font-semibold text-accent">
              Ver todos
            </Link>
          </div>

          {groupsLoading ? (
            <CardListSkeleton count={2} />
          ) : groups.length === 0 ? (
            <EmptyState icon="👥" title="Sin grupos todavía" description="Crea un grupo para compartir gastos con amigos." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {groups.slice(0, 4).map((g) => (
                <GroupCard
                  key={g.id}
                  groupId={g.id}
                  name={g.name}
                  icon={g.icon}
                  color={g.color}
                  balance={summaries[g.id]?.balance ?? 0}
                  currency={g.currency}
                />
              ))}
            </div>
          )}
        </section>

        {!loading && expenses.length === 0 && groups.length === 0 && (
          <div className="mt-4">
            <EmptyState icon="🎫" title="Bienvenido a Splitter" description="Añade tu primer gasto con el botón + de abajo." />
          </div>
        )}
      </PageContainer>
    </>
  );
}
