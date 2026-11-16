import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight, HandCoins, Repeat, TrendingDown, TrendingUp, UserPlus, Users, type LucideIcon } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Avatar } from "../components/ui/Avatar";
import { GroupCard } from "../components/group/GroupCard";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { usePersonalExpenses } from "../hooks/usePersonalExpenses";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useGroups } from "../hooks/useGroups";
import { useDebts } from "../hooks/useDebts";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { formatCurrency, formatDate } from "../lib/format";
import { categoryById } from "../lib/categories";
import { shiftMonth, todayISO } from "../domain/date";
import { summarizeDebts } from "../domain/debts";
import { recurringSpentForMonth, summarizeRecurringBudget } from "../domain/budget";
import { upcomingPayments, type UpcomingKind } from "../domain/upcoming";
import type { Currency } from "../types";

function greeting(hour: number) {
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

const MONTH_NAME = new Intl.DateTimeFormat("es-ES", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

function monthDate(month: string) {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const UPCOMING_LINK: Record<UpcomingKind, string> = {
  expense: "/gastos?tab=proximos",
  recurring: "/gastos?tab=recurrentes",
  debt: "/gastos?tab=deudas",
};

export function Home() {
  const { profile } = useAuth();
  const { expenses, loading } = usePersonalExpenses();
  const { items: recurring } = useRecurringExpenses();
  const { groups, loading: groupsLoading } = useGroups();
  const { debts } = useDebts();
  const summaries = useGroupsSummary(groups, profile?.uid);

  const currency: Currency = profile?.currency ?? "EUR";
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);

  const spending = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(thisMonth, i - 5));
    const totals: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const byCategory: Record<string, number> = {};

    for (const e of expenses) {
      if (e.status === "future") continue;
      const month = e.date.slice(0, 7);
      if (month in totals) totals[month] += e.amount;
      if (month === thisMonth) byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
    }
    // Fixed expenses ticked off this month count as spent too — they live
    // in their own collection and never show up in `expenses`.
    totals[thisMonth] += recurringSpentForMonth(recurring, thisMonth);

    const thisTotal = totals[thisMonth];
    const lastTotal = totals[lastMonth];
    const categoryTotal = Object.values(byCategory).reduce((a, b) => a + b, 0);
    return {
      months,
      totals,
      thisTotal,
      lastTotal,
      delta: lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null,
      dailyAverage: thisTotal / Number(today.slice(8)),
      categories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id, amount]) => ({ category: categoryById(id), amount, share: categoryTotal > 0 ? amount / categoryTotal : 0 })),
      recent: expenses.filter((e) => e.status !== "future").slice(0, 5),
    };
  }, [expenses, recurring, thisMonth, lastMonth, today]);

  const upcoming = useMemo(() => upcomingPayments(expenses, recurring, debts, today), [expenses, recurring, debts, today]);
  const upcomingTotal = upcoming.filter((u) => u.currency === currency).reduce((sum, u) => sum + u.amount, 0);
  const debtSummary = useMemo(() => summarizeDebts(debts, currency, today), [debts, currency, today]);
  const fixed = useMemo(() => summarizeRecurringBudget(recurring, thisMonth, 0), [recurring, thisMonth]);
  const fixedPaid = recurring.filter((r) => r.lastCompletedMonth === thisMonth).length;

  // What the groups add up to for me. Only groups in my own currency — there
  // are no exchange rates anywhere in the app to add the others with.
  const groupBalance = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const g of groups) {
      if (g.currency !== currency) continue;
      const balance = summaries[g.id]?.balance ?? 0;
      if (balance > 0.004) owed += balance;
      else if (balance < -0.004) owe -= balance;
    }
    return { owed, owe };
  }, [groups, summaries, currency]);

  const firstName = profile?.name.split(" ")[0];
  const maxMonth = Math.max(...Object.values(spending.totals), 1);
  const isNewAccount = !loading && expenses.length === 0 && groups.length === 0 && debts.length === 0 && recurring.length === 0;

  return (
    <>
      <TopBar
        title={`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
        subtitle={capitalize(WEEKDAY_FORMATTER.format(new Date()))}
        right={
          profile && (
            <Link to="/perfil" aria-label="Ir a mi perfil" className="pressable shrink-0 rounded-full">
              <Avatar name={profile.name} color={profile.color} photoUrl={profile.photoUrl} size="lg" />
            </Link>
          )
        }
      />
      <PageContainer>
        <div className="stagger flex flex-col gap-6">
          {/* ------------------------------------------------ Month so far */}
          <Link to="/estadisticas" aria-label="Ver estadísticas del mes" className="hero-card pressable block rounded-[28px] p-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Gastado en {MONTH_NAME.format(new Date())}</p>
                <p className="mt-1.5 text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  {formatCurrency(spending.thisTotal, currency)}
                </p>
                <div className="mt-3">
                  {spending.delta !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        spending.delta <= 0
                          ? "bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark"
                          : "bg-black/[0.06] text-neutral-700 dark:bg-white/10 dark:text-neutral-200"
                      }`}
                    >
                      {spending.delta <= 0 ? <TrendingDown size={13} strokeWidth={2.4} /> : <TrendingUp size={13} strokeWidth={2.4} />}
                      {Math.abs(Math.round(spending.delta))}% vs. {MONTH_NAME.format(monthDate(lastMonth))}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Primer mes con datos</span>
                  )}
                </div>
              </div>

              {/* Last six months at a glance; this month in the accent color. */}
              <div className="flex h-[72px] shrink-0 items-end gap-1.5" aria-hidden>
                {spending.months.map((m) => (
                  <div key={m} className="flex h-full w-[9px] flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-full ${m === thisMonth ? "bg-accent" : "bg-neutral-900/15 dark:bg-white/20"}`}
                      style={{ height: `${Math.max((spending.totals[m] / maxMonth) * 100, 6)}%` }}
                    />
                    <span className={`text-[9px] leading-none ${m === thisMonth ? "font-semibold text-accent-700 dark:text-accent-200" : "text-neutral-400"}`}>
                      {MONTH_SHORT.format(monthDate(m)).charAt(0).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-black/[0.07] pt-3.5 dark:border-white/10">
              <Figure label="Media diaria" value={formatCurrency(spending.dailyAverage, currency)} />
              <Figure label={capitalize(MONTH_NAME.format(monthDate(lastMonth)))} value={formatCurrency(spending.lastTotal, currency)} />
              <Figure label="Por pagar" value={formatCurrency(upcomingTotal, currency)} />
            </dl>
          </Link>

          {/* ------------------------------------------------ Where I stand */}
          <Section title="Tus cuentas">
            <div className="surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
              <AccountRow
                to="/grupos"
                icon={Users}
                label="Grupos"
                caption={groups.length === 0 ? "Aún no tienes grupos" : `${groups.length} activo${groups.length === 1 ? "" : "s"}`}
              >
                <Balance owe={groupBalance.owe} owed={groupBalance.owed} currency={currency} settledLabel={groups.length === 0 ? "—" : "Al día"} />
              </AccountRow>
              <AccountRow
                to="/gastos?tab=deudas"
                icon={HandCoins}
                label="Deudas"
                caption={
                  debtSummary.overdueCount > 0 ? (
                    <span className="font-semibold text-negative dark:text-negative-dark">
                      {debtSummary.overdueCount} vencida{debtSummary.overdueCount === 1 ? "" : "s"}
                    </span>
                  ) : debtSummary.openCount > 0 ? (
                    `${debtSummary.openCount} por saldar`
                  ) : (
                    "Nada pendiente"
                  )
                }
              >
                <Balance owe={debtSummary.iOwe} owed={debtSummary.owedToMe} currency={currency} settledLabel={debtSummary.openCount > 0 ? "Al día" : "—"} />
              </AccountRow>
              <AccountRow
                to="/gastos?tab=recurrentes"
                icon={Repeat}
                label="Gastos fijos"
                caption={recurring.length === 0 ? "Sin configurar" : `${fixedPaid} de ${recurring.length} pagados este mes`}
                progress={recurring.length > 0 ? fixedPaid / recurring.length : undefined}
              >
                {recurring.length === 0 ? (
                  <span className="text-neutral-400">—</span>
                ) : fixed.pending > 0 ? (
                  <span>
                    <span className="block text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Quedan</span>
                    {formatCurrency(fixed.pending, recurring[0].currency)}
                  </span>
                ) : (
                  <span className="text-positive dark:text-positive-dark">Al día</span>
                )}
              </AccountRow>
            </div>
          </Section>

          {/* ------------------------------------------------ What's coming */}
          {upcoming.length > 0 && (
            <Section title="Próximos pagos" to="/gastos?tab=proximos" linkLabel="Ver gastos">
              <div className="surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
                {upcoming.slice(0, 4).map((u) => {
                  const date = new Date(Number(u.date.slice(0, 4)), Number(u.date.slice(5, 7)) - 1, Number(u.date.slice(8)));
                  return (
                    <Link key={u.key} to={UPCOMING_LINK[u.kind]} className="well-press flex items-center gap-3 px-4 py-3 first:rounded-t-[22px] last:rounded-b-[22px]">
                      <span
                        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none ${
                          u.overdue ? "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark" : "well text-neutral-700 dark:text-neutral-200"
                        }`}
                      >
                        <span className="text-[15px] font-semibold tabular-nums">{date.getDate()}</span>
                        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide opacity-70">
                          {MONTH_SHORT.format(date).replace(".", "")}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{u.title}</span>
                        <span className={`block text-xs ${u.overdue ? "font-medium text-negative dark:text-negative-dark" : "text-neutral-500 dark:text-neutral-400"}`}>
                          {u.overdue ? "Vencido · " : ""}
                          {u.detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatCurrency(u.amount, u.currency)}</span>
                    </Link>
                  );
                })}
              </div>
              {upcoming.length > 4 && (
                <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
                  y {upcoming.length - 4} más · {formatCurrency(upcomingTotal, currency)} en total
                </p>
              )}
            </Section>
          )}

          {/* ------------------------------------------------ Where it went */}
          {spending.categories.length > 0 && (
            <Section title="En qué se te va" to="/estadisticas" linkLabel="Estadísticas">
              <div className="surface flex flex-col gap-3.5 rounded-[22px] p-4">
                {spending.categories.map(({ category, amount, share }) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${category.color}22`, color: category.color }}
                      >
                        <category.icon size={16} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.label}</span>
                      <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{Math.round(share * 100)}%</span>
                      <span className="w-[86px] text-right text-sm font-semibold tabular-nums">{formatCurrency(amount, currency)}</span>
                    </div>
                    <div className="ml-[42px] mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10" aria-hidden>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 3)}%`, backgroundColor: category.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ------------------------------------------------ Latest activity */}
          {spending.recent.length > 0 && (
            <Section title="Últimos movimientos" to="/gastos" linkLabel="Ver todos">
              <div className="surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
                {spending.recent.map((e) => {
                  const category = categoryById(e.categoryId);
                  return (
                    <Link key={e.id} to="/gastos" className="well-press flex items-center gap-3 px-4 py-3 first:rounded-t-[22px] last:rounded-b-[22px]">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${category.color}22`, color: category.color }}
                      >
                        <category.icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{e.description}</span>
                        <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                          {formatDate(e.date)} · {category.label}
                        </span>
                      </span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums">−{formatCurrency(e.amount, e.currency)}</span>
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ------------------------------------------------ Groups */}
          <Section title="Grupos" to="/grupos" linkLabel="Ver todos">
            {groupsLoading ? (
              <CardListSkeleton count={2} />
            ) : groups.length === 0 ? (
              <Link to="/grupos?crear=1" className="pressable group flex items-center gap-3.5 rounded-[22px] border border-dashed border-accent/40 bg-accent/[0.06] p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent dark:bg-accent/25 dark:text-accent-300">
                  <UserPlus size={22} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Crea tu primer grupo</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Comparte gastos de viajes, pisos o planes con amigos</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-accent/50" aria-hidden />
              </Link>
            ) : (
              <div className="flex flex-col gap-2.5">
                {groups.slice(0, 3).map((g) => (
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
          </Section>

          {isNewAccount && (
            <p className="flex items-center justify-center gap-2 px-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <CalendarClock size={16} strokeWidth={1.9} className="shrink-0" />
              Añade tu primer gasto con el botón + y esto empezará a llenarse.
            </p>
          )}
        </div>
      </PageContainer>
    </>
  );
}

function Section({ title, to, linkLabel, children }: { title: string; to?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {to && linkLabel && (
          <Link to={to} className="text-[13px] font-semibold text-accent dark:text-accent-300">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function AccountRow({
  to,
  icon: Icon,
  label,
  caption,
  progress,
  children,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  caption: ReactNode;
  /** 0..1 — draws a thin progress bar under the caption. */
  progress?: number;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="well-press flex items-center gap-3 px-4 py-3.5 first:rounded-t-[22px] last:rounded-b-[22px]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{label}</span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{caption}</span>
        {progress !== undefined && (
          <span className="mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden>
            <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(progress, 1) * 100}%` }} />
          </span>
        )}
      </span>
      <span className="shrink-0 text-right text-[15px] font-semibold leading-tight tabular-nums">{children}</span>
      <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
    </Link>
  );
}

/** "You owe" / "you're owed" as a compact right-hand figure. Shows both
 * when both apply (they're separate people; netting them would hide one). */
function Balance({ owe, owed, currency, settledLabel }: { owe: number; owed: number; currency: Currency; settledLabel: string }) {
  if (owe < 0.005 && owed < 0.005) {
    return <span className={settledLabel === "—" ? "text-neutral-400" : "text-positive dark:text-positive-dark"}>{settledLabel}</span>;
  }
  return (
    <span className="flex flex-col items-end gap-0.5">
      {owe >= 0.005 && (
        <span className="text-negative dark:text-negative-dark">
          <span className="mr-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Debes</span>
          {formatCurrency(owe, currency)}
        </span>
      )}
      {owed >= 0.005 && (
        <span className="text-positive dark:text-positive-dark">
          <span className="mr-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">Te deben</span>
          {formatCurrency(owed, currency)}
        </span>
      )}
    </span>
  );
}
