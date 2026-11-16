import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, HandCoins, Sparkles, TrendingDown, TrendingUp, UserPlus } from "lucide-react";
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
import { useDebts } from "../hooks/useDebts";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { formatCurrency, formatDate, formatMonth } from "../lib/format";
import { categoryById } from "../lib/categories";
import { shiftMonth, todayISO } from "../domain/date";
import { summarizeDebts } from "../domain/debts";
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

const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("es-ES", { month: "long" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Home() {
  const { profile } = useAuth();
  const { expenses, loading } = usePersonalExpenses();
  const { items: recurring } = useRecurringExpenses();
  const { groups, loading: groupsLoading } = useGroups();
  const { debts } = useDebts();
  const summaries = useGroupsSummary(groups, profile?.uid);

  const currency = profile?.currency ?? "EUR";
  const today = todayISO();
  const thisMonth = monthKey(today);
  const lastMonth = shiftMonth(thisMonth, -1);

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

  const debtSummary = useMemo(() => summarizeDebts(debts, currency, today), [debts, currency, today]);

  const recurringPending = pendingRecurringCount(recurring, thisMonth);

  const delta = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;
  const firstName = profile?.name.split(" ")[0];
  const dateLabel = capitalize(WEEKDAY_FORMATTER.format(new Date()));
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
          className="glass pressable group relative mb-3 block overflow-hidden rounded-[28px] p-5"
        >
          {/* A blurred pool of the accent color inside the glass, so the
           * card has depth without being a flat gradient block. */}
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-accent/35 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-40 w-40 rounded-full bg-accent-300/25 blur-3xl" />
          <div className="relative">
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Gastado en {MONTH_NAME_FORMATTER.format(new Date())}</p>
            <p className="mt-1.5 text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
              {formatCurrency(thisMonthTotal, currency)}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              {delta !== null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    delta <= 0
                      ? "bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark"
                      : "bg-black/[0.06] text-neutral-700 dark:bg-white/10 dark:text-neutral-200"
                  }`}
                >
                  {delta <= 0 ? <TrendingDown size={13} strokeWidth={2.4} /> : <TrendingUp size={13} strokeWidth={2.4} />}
                  {Math.abs(Math.round(delta))}% vs. {MONTH_NAME_FORMATTER.format(new Date(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5)) - 1, 1))}
                </span>
              ) : (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Sin datos del mes anterior</span>
              )}
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent-700 dark:text-accent-200">
                Ver detalle
                <ChevronRight size={14} strokeWidth={2.4} className="transition-transform duration-200 group-active:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </div>
        </Link>

        <section className="grid grid-cols-2 gap-3">
          <Link
            to={`/estadisticas?month=${lastMonth}`}
            aria-label="Ver estadísticas del mes anterior"
            className="surface pressable rounded-[22px] p-4"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Mes anterior</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{formatCurrency(lastMonthTotal, currency)}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-400">{formatMonth(`${lastMonth}-01`)}</p>
          </Link>
          <Link
            to="/estadisticas"
            aria-label="Ver estadísticas"
            className="surface pressable rounded-[22px] p-4"
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
            className="surface pressable rounded-[22px] p-4"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Recurrentes</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{recurringPending}</p>
            <p className="mt-0.5 text-xs text-neutral-400">por pagar este mes</p>
          </Link>
          <Link
            to="/grupos"
            aria-label="Ver grupos"
            className="surface pressable rounded-[22px] p-4"
          >
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Grupos activos</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{groups.length}</p>
            <p className="mt-0.5 text-xs text-neutral-400">{groups.length === 1 ? "grupo" : "grupos"}</p>
          </Link>
        </section>

        {debtSummary.openCount > 0 && (
          <Link
            to="/gastos?tab=deudas"
            aria-label="Ver deudas y pagos pendientes"
            className="surface pressable mt-3 flex items-center gap-3 rounded-[22px] p-4"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                debtSummary.overdueCount > 0 ? "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark" : "bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
              }`}
            >
              <HandCoins size={19} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Deudas y pendientes
                {debtSummary.overdueCount > 0 && (
                  <span className="ml-1.5 font-semibold text-negative dark:text-negative-dark">
                    {debtSummary.overdueCount} vencida{debtSummary.overdueCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-[15px] font-semibold tabular-nums">
                {debtSummary.iOwe > 0 && <span>Debes {formatCurrency(debtSummary.iOwe, currency)}</span>}
                {debtSummary.owedToMe > 0 && (
                  <span className="text-positive dark:text-positive-dark">Te deben {formatCurrency(debtSummary.owedToMe, currency)}</span>
                )}
                {debtSummary.iOwe === 0 && debtSummary.owedToMe === 0 && <span>{debtSummary.openCount} por saldar</span>}
              </p>
            </div>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
          </Link>
        )}

        {upcoming.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 eyebrow">Próximamente</h2>
            <div className="flex flex-col gap-2">
              {upcoming.map((e) => {
                const ItemIcon = categoryById(e.categoryId).icon;
                return (
                  <Card key={e.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <ItemIcon size={18} strokeWidth={1.8} className="text-neutral-500 dark:text-neutral-400" />
                      <div>
                        <p className="text-sm font-semibold">{e.description}</p>
                        <p className="text-xs text-neutral-400">{formatDate(e.date)}</p>
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
            <h2 className="eyebrow">Grupos</h2>
            <Link to="/grupos" className="text-sm font-semibold text-accent">
              Ver todos
            </Link>
          </div>

          {groupsLoading ? (
            <CardListSkeleton count={2} />
          ) : groups.length === 0 ? (
            <Link
              to="/grupos?crear=1"
              className="group flex items-center gap-3.5 pressable rounded-[22px] border border-dashed border-accent/40 bg-accent/[0.06] p-4"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent dark:bg-accent/25 dark:text-accent-300">
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
            <div className="stagger flex flex-col gap-2.5">
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
