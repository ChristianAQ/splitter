import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles, UserPlus } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { GroupCard } from "../components/group/GroupCard";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useGroups } from "../hooks/useGroups";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { formatCurrency, formatMonth } from "../lib/format";
import { categoryById } from "../lib/categories";
import { todayISO } from "../domain/date";
import { pendingRecurringCount, recurringSpentForMonth } from "../domain/budget";

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function greeting(hour: number) {
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Home() {
  const { profile } = useAuth();
  const { expenses, loading } = usePersonalExpenses();
  const { items: recurring } = useRecurringExpenses();
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

    // Recurring expenses (Netflix, alquiler...) checked off this month count
    // towards "Gastado este mes" too — they never show up in `expenses`
    // (a separate collection, see services/recurringExpenses.service.ts).
    thisTotal += recurringSpentForMonth(recurring, thisMonth);

    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const upcomingList = expenses.filter((e) => e.status === "future").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

    return { thisMonthTotal: thisTotal, lastMonthTotal: lastTotal, topCategory: top, upcoming: upcomingList };
  }, [expenses, recurring, thisMonth, lastMonth]);

  const recurringPending = pendingRecurringCount(recurring, thisMonth);

  const delta = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;
  const firstName = profile?.name.split(" ")[0];
  const dateLabel = capitalize(WEEKDAY_FORMATTER.format(new Date(today)));
  const topCategoryInfo = topCategory ? categoryById(topCategory[0]) : null;

  return (
    <>
      <TopBar
        title={`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
        subtitle={dateLabel}
        right={
          profile && (
            <Link
              to="/perfil"
              aria-label="Ir a mi perfil"
              className="shrink-0 rounded-full transition-transform duration-150 ease-out active:scale-90"
            >
              <Avatar name={profile.name} color={profile.color} photoUrl={profile.photoUrl} size="lg" />
            </Link>
          )
        }
      />
      <PageContainer>
        <Link
          to="/estadisticas"
          aria-label="Ver estadísticas del mes"
          className="group mb-4 flex items-center justify-between overflow-hidden rounded-xl2 bg-gradient-to-br from-accent to-accent-700 p-4 text-white shadow-card transition-all duration-150 ease-out active:scale-[0.98] active:shadow-none"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-accent-100">Gastado este mes</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{formatCurrency(thisMonthTotal, currency)}</p>
            {delta !== null ? (
              <p className="mt-1 text-xs font-medium text-accent-100">
                {delta <= 0 ? "▼" : "▲"} {Math.abs(Math.round(delta))}% vs. {formatMonth(`${lastMonth}-01`)}
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-accent-100">Sin datos del mes anterior</p>
            )}
          </div>
          <ChevronRight
            size={20}
            strokeWidth={2.25}
            className="shrink-0 text-accent-100 transition-transform duration-150 ease-out group-active:translate-x-0.5"
            aria-hidden
          />
        </Link>

        <section className="grid grid-cols-2 gap-3">
          <Link
            to={`/estadisticas?month=${lastMonth}`}
            aria-label="Ver estadísticas del mes anterior"
            className="rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98] dark:bg-surface-dark-subtle"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Mes anterior</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(lastMonthTotal, currency)}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-400">{formatMonth(`${lastMonth}-01`)}</p>
          </Link>
          <Link
            to="/estadisticas"
            aria-label="Ver estadísticas"
            className="rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98] dark:bg-surface-dark-subtle"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Categoría top</p>
            {topCategoryInfo ? (
              <>
                <topCategoryInfo.icon size={22} strokeWidth={1.8} className="mt-1 text-neutral-700 dark:text-neutral-200" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{topCategoryInfo.label}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-neutral-400">Sin datos</p>
            )}
          </Link>
          <Link
            to="/gastos?tab=recurrentes"
            aria-label="Ver gastos recurrentes pendientes"
            className="rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98] dark:bg-surface-dark-subtle"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Recurrentes</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{recurringPending}</p>
            <p className="mt-0.5 text-xs text-neutral-400">por pagar este mes</p>
          </Link>
          <Link
            to="/grupos"
            aria-label="Ver grupos"
            className="rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98] dark:bg-surface-dark-subtle"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Grupos activos</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{groups.length}</p>
            <p className="mt-0.5 text-xs text-neutral-400">{groups.length === 1 ? "grupo" : "grupos"}</p>
          </Link>
        </section>

        {upcoming.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Próximamente</h2>
            <div className="flex flex-col gap-2">
              {upcoming.map((e) => {
                const ItemIcon = categoryById(e.categoryId).icon;
                return (
                  <Card key={e.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <ItemIcon size={18} strokeWidth={1.8} className="text-neutral-500 dark:text-neutral-400" />
                      <div>
                        <p className="text-sm font-semibold">{e.description}</p>
                        <p className="text-xs text-neutral-400">{e.date}</p>
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{formatCurrency(e.amount, e.currency)}</span>
                  </Card>
                );
              })}
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
            <Link
              to="/grupos?crear=1"
              className="group flex items-center gap-3.5 rounded-2xl border-2 border-dashed border-accent-200 bg-accent-50/50 p-4 transition-transform active:scale-[0.98] dark:border-accent-900/40 dark:bg-accent-900/10"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent dark:bg-accent-900/40 dark:text-accent-300">
                <UserPlus size={22} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Crea tu primer grupo</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Comparte gastos de viajes, pisos o planes con amigos
                </p>
              </div>
              <ChevronRight
                size={18}
                strokeWidth={2}
                className="shrink-0 text-accent/50 transition-transform duration-150 ease-out group-active:translate-x-0.5"
                aria-hidden
              />
            </Link>
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
            <EmptyState icon={Sparkles} title="Bienvenido a Splitter" description="Añade tu primer gasto con el botón + de abajo." />
          </div>
        )}
      </PageContainer>
    </>
  );
}
