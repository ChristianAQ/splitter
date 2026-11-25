import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart3, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Users } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { StickySubnav } from "../components/layout/StickySubnav";
import { Avatar } from "../components/ui/Avatar";
import { BottomSheet } from "../components/ui/BottomSheet";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { MonthColumns } from "../components/charts/MonthColumns";
import { RankedBars } from "../components/charts/RankedBars";
import { SegmentedBar } from "../components/charts/SegmentedBar";
import { StackedColumns } from "../components/charts/StackedColumns";
import { PaceLine } from "../components/charts/PaceLine";
import { FixedCommitmentsCard } from "../components/expense/FixedCommitmentsCard";
import { useAuth } from "../context/AuthContext";
import { useSpending } from "../hooks/useSpending";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useDebts } from "../hooks/useDebts";
import { useGroups } from "../hooks/useGroups";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { GROUPS_CATEGORY, categoryById } from "../lib/categories";
import { groupIconComponent } from "../lib/groupIcons";
import { formatCurrency, formatDate, formatMonth, formatSignedCurrency } from "../lib/format";
import { shiftMonth, todayISO } from "../domain/date";
import { summarizeRecurringBudget } from "../domain/budget";
import { debtActivityInMonth } from "../domain/debts";
import { changePercent, cumulativeByDay, dailyAverage, projectedMonthEnd } from "../domain/spending";
import { daysInMonth } from "../domain/date";
import type { Currency } from "../types";
import { readLast, writeLast } from "../lib/lastPlace";

type Scope = "personal" | string;

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });
const MONTH_LONG = new Intl.DateTimeFormat("es-ES", { month: "long" });
const monthDate = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);
const shortLabel = (month: string) => MONTH_SHORT.format(monthDate(month)).replace(".", "");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How many months the charts look back. */
const WINDOW = 6;
/** Categories shown before "ver todas". */
const CATEGORY_LIMIT = 6;

export function Stats() {
  const { groups } = useGroups();
  const [scope, setScopeState] = useState<Scope>(() => readLast("stats-scope") ?? "personal");
  const setScope = (next: Scope) => {
    setScopeState(next);
    writeLast("stats-scope", next);
  };
  const [searchParams] = useSearchParams();
  const active = scope === "personal" || groups.some((g) => g.id === scope) ? scope : "personal";

  const chip = (selected: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
      selected
        ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgb(20_22_40/0.08),0_6px_14px_-8px_rgb(20_22_40/0.35)] dark:bg-white/[0.16] dark:text-white dark:shadow-none"
        : "text-neutral-500 dark:text-neutral-400"
    }`;

  return (
    <>
      <TopBar title="Estadísticas" />
      <PageContainer>
        {/* What everything below is about: my own spending, or one group's. */}
        {groups.length > 0 && (
          <StickySubnav className="mb-3">
            <div className="well no-scrollbar flex gap-1 overflow-x-auto rounded-full p-1" role="tablist" aria-label="De quién son las estadísticas">
              <button role="tab" aria-selected={active === "personal"} onClick={() => setScope("personal")} className={chip(active === "personal")}>
                Tus gastos
              </button>
              {groups.map((g) => {
                const GroupIcon = groupIconComponent(g.icon);
                return (
                  <button key={g.id} role="tab" aria-selected={active === g.id} onClick={() => setScope(g.id)} className={chip(active === g.id)}>
                    <GroupIcon size={15} strokeWidth={2} />
                    {g.name}
                  </button>
                );
              })}
            </div>
          </StickySubnav>
        )}

        {active === "personal" ? <PersonalStats initialMonth={searchParams.get("month") ?? undefined} /> : <GroupStats key={active} groupId={active} />}
      </PageContainer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------

function PersonalStats({ initialMonth }: { initialMonth?: string }) {
  // One month more than is drawn, so the oldest column still has a
  // "previous month" to be compared with.
  const { summary, expenses, groupShareByDay, loading, currency, today, thisMonth } = useSpending(WINDOW + 1);
  const { items: recurring } = useRecurringExpenses();
  const { debts } = useDebts();
  const months = summary.months.slice(1);
  const [picked, setPicked] = useState(initialMonth ?? thisMonth);
  const [allCategories, setAllCategories] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const selected = months.includes(picked) ? picked : thisMonth;
  const index = months.indexOf(selected);
  const month = summary.byMonth[selected];
  const previous = shiftMonth(selected, -1);
  const isCurrent = selected === thisMonth;
  const money = (value: number) => formatCurrency(value, currency);

  const average = useMemo(() => {
    const totals = months.map((m) => summary.byMonth[m].total).filter((t) => t > 0);
    return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  }, [summary, months]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.status !== "future" && e.date.slice(0, 7) === selected),
    [expenses, selected]
  );
  const biggest = useMemo(() => [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5), [monthExpenses]);
  const fixed = useMemo(() => summarizeRecurringBudget(recurring, thisMonth, 0), [recurring, thisMonth]);
  const debtActivity = useMemo(() => debtActivityInMonth(debts, selected, currency), [debts, selected, currency]);
  // Day by day through the month picked, against the month before.
  const pace = useMemo(() => {
    const [y, m] = selected.split("-").map(Number);
    const [py, pm] = previous.split("-").map(Number);
    return {
      current: cumulativeByDay(expenses, groupShareByDay, selected, today),
      previous: cumulativeByDay(expenses, groupShareByDay, previous),
      days: Math.max(daysInMonth(y, m - 1), daysInMonth(py, pm - 1)),
    };
  }, [expenses, groupShareByDay, selected, previous, today]);

  if (loading) return <CardListSkeleton count={3} />;
  if (months.every((m) => summary.byMonth[m].total === 0) && recurring.length === 0 && debts.length === 0) {
    return <EmptyState icon={BarChart3} title="Sin datos todavía" description="Cuando apuntes gastos verás aquí cuánto gastas, en qué y cómo cambia de un mes a otro." />;
  }

  const delta = changePercent(month.total, summary.byMonth[previous]?.total ?? 0);
  const projection = isCurrent && month.total > 0 ? projectedMonthEnd(month, today) : null;
  const showProjection = projection !== null && projection - month.total >= 1;
  const categoryRows = Object.entries(summary.categories[selected]).map(([id, value]) => {
    const category = categoryById(id);
    return {
      key: id,
      label: category.label,
      value,
      leading: (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
          <category.icon size={16} strokeWidth={1.9} />
        </span>
      ),
    };
  });
  const sortedCategoryRows = [...categoryRows].sort((a, b) => b.value - a.value);
  const visibleCategoryRows = allCategories ? sortedCategoryRows : sortedCategoryRows.slice(0, CATEGORY_LIMIT);
  const opened = openCategory ? categoryById(openCategory) : null;
  const openedExpenses = openCategory ? monthExpenses.filter((e) => e.categoryId === openCategory).sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ The month */}
      <section className="hero-card rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <StepButton label="Mes anterior" disabled={index <= 0} onClick={() => setPicked(months[index - 1])}>
            <ChevronLeft size={18} strokeWidth={2.2} />
          </StepButton>
          <p className="text-sm font-semibold" aria-live="polite">
            {capitalize(formatMonth(`${selected}-01`))}
          </p>
          <StepButton label="Mes siguiente" disabled={index >= months.length - 1} onClick={() => setPicked(months[index + 1])}>
            <ChevronRight size={18} strokeWidth={2.2} />
          </StepButton>
        </div>

        <div className="mt-3 text-center">
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{isCurrent ? "Llevas gastado" : "Gastaste"}</p>
          <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.04em]">{money(month.total)}</p>
          <div className="mt-3 flex justify-center">
            {delta === null ? (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Sin datos de {MONTH_LONG.format(monthDate(previous))} para comparar</span>
            ) : (
              // Spending more is the bad direction here, so "up" takes the
              // warning color — always with an arrow and words, never the
              // color alone.
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  delta <= 0
                    ? "bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark"
                    : "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark"
                }`}
              >
                {delta <= 0 ? <TrendingDown size={13} strokeWidth={2.4} /> : <TrendingUp size={13} strokeWidth={2.4} />}
                {Math.abs(Math.round(delta))}% {delta <= 0 ? "menos" : "más"} que en {MONTH_LONG.format(monthDate(previous))}
              </span>
            )}
          </div>
          {showProjection && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              A este ritmo acabarás el mes en torno a <span className="font-semibold text-neutral-900 dark:text-neutral-50">{money(projection)}</span>
            </p>
          )}
        </div>

        <div className="mt-5">
          <MonthColumns
            caption={`Gasto de los últimos ${WINDOW} meses`}
            columns={months.map((m) => ({ key: m, label: shortLabel(m), name: formatMonth(`${m}-01`), value: summary.byMonth[m].total }))}
            formatValue={money}
            average={average}
            selectedKey={selected}
            onSelect={setPicked}
          />
        </div>
      </section>

      {/* ------------------------------------------------ Key figures */}
      <div className="grid grid-cols-3 gap-2.5">
        <Figure label="Media diaria" value={money(dailyAverage(month.total, selected, today))} />
        <Figure label="Media mensual" value={money(average)} />
        <Figure label="Movimientos" value={String(month.count)} />
      </div>

      {/* ------------------------------------------------ Pace */}
      {(month.total > 0 || summary.byMonth[previous]?.total > 0) && (
        <Panel title={isCurrent ? "Cómo vas este mes" : "Cómo fue el mes"}>
          <p className="-mt-1 mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            Lo gastado acumulado, día a día, frente a {MONTH_LONG.format(monthDate(previous))}. Desliza el dedo por la gráfica para ver cada día.
          </p>
          <PaceLine
            caption={`Gasto acumulado por día en ${formatMonth(`${selected}-01`)} y ${formatMonth(`${previous}-01`)}`}
            monthName={MONTH_LONG.format(monthDate(selected))}
            days={pace.days}
            formatValue={money}
            series={[
              { key: "current", label: capitalize(MONTH_LONG.format(monthDate(selected))), color: "rgb(var(--accent-500))", values: pace.current },
              { key: "previous", label: capitalize(MONTH_LONG.format(monthDate(previous))), color: "var(--series-muted)", dashed: true, values: pace.previous },
            ]}
          />
          {isCurrent && pace.current.length > 0 && pace.previous.length >= pace.current.length && (
            <PaceVerdict now={pace.current[pace.current.length - 1]} then={pace.previous[pace.current.length - 1]} money={money} previousName={MONTH_LONG.format(monthDate(previous))} />
          )}
        </Panel>
      )}

      {month.total > 0 ? (
        <>
          {/* ---------------------------------------------- Where from */}
          <Panel title="De dónde sale">
            <SegmentedBar
              formatValue={money}
              segments={[
                { key: "variable", label: "Variables", detail: "Gastos del día a día", value: month.variable, color: "var(--series-1)" },
                { key: "fixed", label: "Fijos", detail: "Los que has marcado como pagados", value: month.fixed, color: "var(--series-2)" },
                { key: "groups", label: "Grupos", detail: "Tu parte de los gastos compartidos", value: month.groups, color: "var(--series-3)" },
              ]}
            />
            <p className="mb-2 mt-5 text-[13px] font-semibold">Mes a mes</p>
            <StackedColumns
              caption={`Variables, fijos y grupos en los últimos ${WINDOW} meses`}
              formatValue={money}
              selectedKey={selected}
              onSelect={setPicked}
              series={[
                { key: "variable", label: "Variables", color: "var(--series-1)" },
                { key: "fixed", label: "Fijos", color: "var(--series-2)" },
                { key: "groups", label: "Grupos", color: "var(--series-3)" },
              ]}
              columns={months.map((m) => ({
                key: m,
                label: shortLabel(m),
                name: capitalize(formatMonth(`${m}-01`)),
                values: { variable: summary.byMonth[m].variable, fixed: summary.byMonth[m].fixed, groups: summary.byMonth[m].groups },
              }))}
            />
          </Panel>

          {/* ---------------------------------------------- On what */}
          <Panel title="En qué">
            <RankedBars rows={visibleCategoryRows} formatValue={money} showShare onSelect={setOpenCategory} />
            {sortedCategoryRows.length > CATEGORY_LIMIT && (
              <button type="button" onClick={() => setAllCategories((v) => !v)} className="pressable mt-1 w-full py-2 text-center text-[13px] font-semibold text-accent dark:text-accent-300">
                {allCategories ? "Ver menos" : `Ver las ${sortedCategoryRows.length} categorías`}
              </button>
            )}
          </Panel>
        </>
      ) : (
        <p className="surface rounded-[22px] p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No hay gastos en {formatMonth(`${selected}-01`)}.
        </p>
      )}

      {/* ------------------------------------------------ Fixed costs */}
      {isCurrent && recurring.length > 0 && (
        <Panel title="Gastos fijos de este mes" link={{ to: "/gastos?tab=recurrentes", label: "Ver" }}>
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <span className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{money(fixed.spent)}</span> pagado
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">de {money(fixed.totalRecurring)}</p>
          </div>
          {/* Track and fill from the same hue, so the bar reads as one thing filling up. */}
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-accent/15 dark:bg-accent/25"
            role="meter"
            aria-label="Gastos fijos pagados este mes"
            aria-valuemin={0}
            aria-valuemax={fixed.totalRecurring}
            aria-valuenow={fixed.spent}
            aria-valuetext={`${money(fixed.spent)} de ${money(fixed.totalRecurring)}`}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${fixed.totalRecurring > 0 ? Math.min(fixed.spent / fixed.totalRecurring, 1) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {fixed.pending > 0 ? `Te quedan ${money(fixed.pending)} por pagar este mes.` : "Todos pagados este mes."}
          </p>
        </Panel>
      )}

      {/* ------------------------------------------------ How long they last */}
      {isCurrent && recurring.some((r) => r.active && r.currency === currency) && (
        <Panel title="Hasta cuándo pagas tus fijos" link={{ to: "/gastos?tab=recurrentes", label: "Ver" }}>
          <FixedCommitmentsCard recurring={recurring} currency={currency} today={today} bare />
        </Panel>
      )}

      {/* ------------------------------------------------ Loans */}
      {debtActivity.byPerson.length > 0 && (
        <Panel title="Deudas con otras personas" link={{ to: "/gastos?tab=deudas", label: "Ver" }}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="well rounded-[16px] px-3 py-2.5">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Has devuelto</p>
              <p className="mt-0.5 text-[16px] font-semibold tracking-tight">{money(debtActivity.repaid)}</p>
            </div>
            <div className="well rounded-[16px] px-3 py-2.5">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Te han devuelto</p>
              <p className="mt-0.5 text-[16px] font-semibold tracking-tight">{money(debtActivity.collected)}</p>
            </div>
          </div>
          <ul className="mt-2 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {debtActivity.byPerson.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">{p.name}</span>
                <span className="flex shrink-0 flex-col items-end tabular-nums">
                  {p.repaid > 0 && (
                    <span>
                      <span className="mr-1.5 text-xs text-neutral-500 dark:text-neutral-400">le devolviste</span>
                      <span className="font-semibold">{money(p.repaid)}</span>
                    </span>
                  )}
                  {p.collected > 0 && (
                    <span>
                      <span className="mr-1.5 text-xs text-neutral-500 dark:text-neutral-400">te devolvió</span>
                      <span className="font-semibold">{money(p.collected)}</span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            No entra en el total de arriba: devolver o cobrar un préstamo no es un gasto nuevo.
          </p>
        </Panel>
      )}

      {/* ------------------------------------------------ Biggest */}
      {biggest.length > 0 && (
        <Panel title="Los gastos más grandes" link={{ to: "/gastos", label: "Ver todos" }}>
          <ul className="-my-1 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {biggest.map((e) => {
              const category = categoryById(e.categoryId);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                    <category.icon size={16} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.description}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(e.date)} · {e.recurringSourceId ? "Fijo" : category.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(e.amount, e.currency)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* ------------------------------------------------ One category */}
      <BottomSheet open={opened !== null} onClose={() => setOpenCategory(null)} title={opened ? `${opened.label} · ${shortLabel(selected)}` : undefined}>
        {opened && (
          <div className="flex flex-col gap-3 pb-2 pt-1">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{money(summary.categories[selected][opened.id] ?? 0)}</span>{" "}
              {month.total > 0 && `· ${Math.round(((summary.categories[selected][opened.id] ?? 0) / month.total) * 100)}% del mes`}
            </p>
            {opened.id === GROUPS_CATEGORY.id ? (
              <div className="well flex items-start gap-3 rounded-[22px] p-4 text-sm text-neutral-600 dark:text-neutral-300">
                <Users size={18} strokeWidth={1.9} className="mt-0.5 shrink-0" />
                <p>
                  Es tu parte de lo que han gastado tus grupos este mes, la hayas pagado tú o no.{" "}
                  <Link to="/grupos" className="font-semibold text-accent dark:text-accent-300">
                    Ver grupos
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="well divide-y divide-black/[0.06] rounded-[22px] px-4 dark:divide-white/[0.08]">
                {openedExpenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{e.description}</span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400">{formatDate(e.date)}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(e.amount, e.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One group
// ---------------------------------------------------------------------------

function GroupStats({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { group, activeMembers, expenses, balances, loading } = useGroupDetail(groupId);
  const thisMonth = todayISO().slice(0, 7);

  const stats = useMemo(() => {
    const months = Array.from({ length: WINDOW }, (_, i) => shiftMonth(thisMonth, i - (WINDOW - 1)));
    const byMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const byCategory: Record<string, number> = {};
    let total = 0;
    let mine = 0;
    for (const e of expenses) {
      total += e.amount;
      mine += e.splits.find((s) => s.uid === user?.uid)?.amount ?? 0;
      byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
      const month = e.date.slice(0, 7);
      if (month in byMonth) byMonth[month] += e.amount;
    }
    return { months, byMonth, byCategory, total, mine };
  }, [expenses, user?.uid, thisMonth]);

  if (loading || !group) return <CardListSkeleton count={3} />;
  if (expenses.length === 0) {
    return <EmptyState icon={BarChart3} title="Sin gastos todavía" description="Cuando el grupo tenga gastos verás aquí quién ha pagado qué y cómo van los saldos." />;
  }

  const currency: Currency = group.currency;
  const money = (value: number) => formatCurrency(value, currency);
  const balanceOf = (uid: string) => balances.find((b) => b.uid === uid);
  const maxNet = Math.max(...balances.map((b) => Math.abs(b.net)), 0.01);

  return (
    <div className="flex flex-col gap-4">
      <section className="hero-card rounded-[28px] p-5">
        <div className="text-center">
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Ha gastado el grupo</p>
          <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.04em]">{money(stats.total)}</p>
          <p className="mt-2.5 text-xs text-neutral-500 dark:text-neutral-400">
            {expenses.length} gasto{expenses.length === 1 ? "" : "s"} · tu parte{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">{money(stats.mine)}</span>
          </p>
        </div>
        <div className="mt-5">
          <MonthColumns
            caption={`Gasto del grupo en los últimos ${WINDOW} meses`}
            columns={stats.months.map((m) => ({ key: m, label: shortLabel(m), name: formatMonth(`${m}-01`), value: stats.byMonth[m] }))}
            formatValue={money}
            selectedKey={thisMonth}
          />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        <Figure label="Por persona" value={money(stats.total / Math.max(activeMembers.length, 1))} />
        <Figure label="Gasto medio" value={money(stats.total / expenses.length)} />
        <Figure label="Miembros" value={String(activeMembers.length)} />
      </div>

      <Panel title="Quién ha pagado">
        <RankedBars
          formatValue={money}
          rows={activeMembers.map((m) => ({
            key: m.uid,
            label: m.uid === user?.uid ? "Tú" : m.name,
            value: balanceOf(m.uid)?.paid ?? 0,
            detail: `Le tocaban ${money(balanceOf(m.uid)?.owed ?? 0)}`,
            leading: <Avatar name={m.name} color={m.color} photoUrl={m.photoUrl} size="sm" />,
          }))}
        />
        {activeMembers.some((m) => (balanceOf(m.uid)?.paid ?? 0) === 0) && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {activeMembers
              .filter((m) => (balanceOf(m.uid)?.paid ?? 0) === 0)
              .map((m) => (m.uid === user?.uid ? "Tú" : m.name))
              .join(", ")}{" "}
            aún no ha{activeMembers.filter((m) => (balanceOf(m.uid)?.paid ?? 0) === 0).length > 1 ? "n" : ""} pagado nada.
          </p>
        )}
      </Panel>

      {/* Above or below zero: bars grow right (is owed) or left (owes) from
       * a shared center line, each with its signed figure in words. */}
      <Panel title="Saldos">
        <ul className="flex flex-col gap-3">
          {activeMembers.map((m) => {
            const net = balanceOf(m.uid)?.net ?? 0;
            const settled = Math.abs(net) < 0.005;
            const width = `${(Math.abs(net) / maxNet) * 50}%`;
            return (
              <li key={m.uid}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{m.uid === user?.uid ? "Tú" : m.name}</span>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                    {settled ? "Al día" : net > 0 ? "Le deben" : "Debe"}{" "}
                    {!settled && <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{formatSignedCurrency(net, currency)}</span>}
                  </span>
                </div>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-neutral-900/[0.06] dark:bg-white/10" aria-hidden>
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-neutral-900/25 dark:bg-white/30" />
                  {!settled && (
                    <span
                      className={`absolute inset-y-0 ${net > 0 ? "left-1/2 rounded-r-full bg-positive" : "right-1/2 rounded-l-full bg-negative"}`}
                      style={{ width }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="En qué">
        <RankedBars
          formatValue={money}
          showShare
          rows={Object.entries(stats.byCategory).map(([id, value]) => {
            const category = categoryById(id);
            return {
              key: id,
              label: category.label,
              value,
              leading: (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                  <category.icon size={16} strokeWidth={1.9} />
                </span>
              ),
            };
          })}
        />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function Panel({ title, link, children }: { title: string; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="surface rounded-[22px] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="text-[13px] font-semibold text-accent dark:text-accent-300">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** A labelled number. No tabular figures: those are for columns of numbers
 * that have to line up, and at this size they just look loose. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface min-w-0 rounded-[18px] px-3 py-3">
      <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 truncate text-[16px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="hit-slop well well-press pressable flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 disabled:opacity-30 dark:text-neutral-200"
    >
      {children}
    </button>
  );
}

/** One line under the pace chart: ahead of last month at this point, or behind. */
function PaceVerdict({ now, then, money, previousName }: { now: number; then: number; money: (v: number) => string; previousName: string }) {
  const diff = now - then;
  if (Math.abs(diff) < 1) {
    return <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Vas igual que en {previousName} a estas alturas.</p>;
  }
  const less = diff < 0;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
      {less ? <TrendingDown size={14} strokeWidth={2.2} className="shrink-0 text-positive dark:text-positive-dark" /> : <TrendingUp size={14} strokeWidth={2.2} className="shrink-0 text-negative dark:text-negative-dark" />}
      <span>
        Llevas <span className="font-semibold text-neutral-900 dark:text-neutral-50">{money(Math.abs(diff))}</span> {less ? "menos" : "más"} que en {previousName} a estas alturas.
      </span>
    </p>
  );
}
