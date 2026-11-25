import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  Circle,
  Clock,
  HandCoins,
  Link2,
  LogOut,
  Pencil,
  PartyPopper,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { groupIconComponent } from "../lib/groupIcons";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { StickySubnav } from "../components/layout/StickySubnav";
import { Avatar } from "../components/ui/Avatar";
import { FAB } from "../components/layout/FAB";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { BottomSheet } from "../components/ui/BottomSheet";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GroupExpenseCard } from "../components/expense/GroupExpenseCard";
import { GroupExpenseSheet } from "../components/expense/GroupExpenseSheet";
import { GroupExpenseDetailSheet } from "../components/expense/GroupExpenseDetailSheet";
import { GroupSettingsSheet } from "../components/group/GroupSettingsSheet";
import { AddGroupFriendsSheet } from "../components/group/AddGroupFriendsSheet";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { useFriends } from "../hooks/useFriends";
import { useGroups } from "../hooks/useGroups";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatDateLong, formatMonth, formatSignedCurrency } from "../lib/format";
import { recordPayment, revertPayment } from "../services/payments.service";
import { deleteGroupExpense, restoreGroupExpense } from "../services/expenses.service";
import { addFriendByUid } from "../services/friends.service";
import { setGroupArchivedForMe } from "../services/users.service";
import { logHistory } from "../services/history.service";
import { localISO } from "../domain/date";
import type { GroupExpense, GroupMember, SettlementTransfer } from "../types";

type Tab = "resumen" | "gastos" | "balance" | "historial";

const TABS: [Tab, string][] = [
  ["resumen", "Resumen"],
  ["gastos", "Gastos"],
  ["balance", "Saldos"],
  ["historial", "Actividad"],
];
const TAB_KEYS = TABS.map(([key]) => key);

const TIME = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { group, members, activeMembers, expenses, payments, history, balances, settlement, loading, notFound, error } = useGroupDetail(groupId);
  const { friends } = useFriends();
  const { archivedForMeIds } = useGroups();
  // The open tab lives in the URL, so going into an expense, a member or
  // another screen and coming back lands on the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = TAB_KEYS.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "resumen";
  const setTab = (next: Tab) => {
    setSearchParams(next === "resumen" ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  // While the group itself loads, the list it was opened from already
  // knows its name.
  const { groups: myGroups, archivedGroups: myArchived } = useGroups();
  const known = [...myGroups, ...myArchived].find((g) => g.id === groupId);
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addingFriends, setAddingFriends] = useState(false);
  const [settlingUp, setSettlingUp] = useState<SettlementTransfer | null>(null);

  const membersById = new Map(activeMembers.map((m) => [m.uid, m]));
  const isAdmin = group?.createdBy === user?.uid;
  const isArchived = Boolean(group?.archivedAt);
  const isArchivedForMe = Boolean(group && archivedForMeIds.has(group.id));
  const GroupIcon = group ? groupIconComponent(group.icon) : null;
  const friendUids = useMemo(() => new Set(friends.map((f) => f.uid)), [friends]);

  async function handleAddFriend(member: GroupMember) {
    if (!user || !profile) return;
    try {
      const result = await addFriendByUid(
        user.uid,
        profile.name,
        profile.color,
        profile.photoUrl,
        member.uid,
        member.name,
        member.color,
        member.photoUrl
      );
      show(result.alreadyFriend ? `Ya erais amigos con ${result.name}` : `${result.name} añadido a tus amigos`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo añadir.", "error");
    }
  }

  function addFriendAction(m: GroupMember) {
    const canAdd = m.uid !== user?.uid && !m.isGhost && !friendUids.has(m.uid);
    if (!canAdd) return undefined;
    return (
      <button
        type="button"
        onClick={() => handleAddFriend(m)}
        aria-label={`Añadir a ${m.name} como amigo`}
        title="Añadir como amigo"
        className="hit-slop flex h-8 w-8 shrink-0 items-center justify-center rounded-full pressable bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
      >
        <UserPlus size={13} strokeWidth={2.2} />
      </button>
    );
  }

  if (notFound) {
    return (
      <>
        <TopBar title="Grupo" onBack backTo="/grupos" />
        <ErrorState message="Este grupo ya no existe o no tienes acceso a él." />
      </>
    );
  }

  if (loading || !group) {
    return (
      <>
        <TopBar title={known?.name ?? "Grupo"} onBack backTo="/grupos" />
        <PageContainer>
          <CardListSkeleton />
        </PageContainer>
      </>
    );
  }

  const viewingExpense = viewingExpenseId ? expenses.find((e) => e.id === viewingExpenseId) : undefined;
  const myBalance = balances.find((b) => b.uid === user?.uid)?.net ?? 0;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  async function handleMarkPaid(transfer: SettlementTransfer) {
    if (!user || !group || settlingUp) return;
    setSettlingUp(transfer);
    try {
      await recordPayment(group.id, user.uid, {
        fromUid: transfer.fromUid,
        toUid: transfer.toUid,
        amount: transfer.amount,
        currency: group.currency,
      });
      const fromName = membersById.get(transfer.fromUid)?.name ?? "Alguien";
      const toName = membersById.get(transfer.toUid)?.name ?? "Alguien";
      await logHistory(
        group.id,
        "payment_recorded",
        user.uid,
        membersById.get(user.uid)?.name ?? "Alguien",
        `${fromName} pagó ${formatCurrency(transfer.amount, group.currency)} a ${toName}`
      );
      show("Pago registrado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo registrar el pago.", "error");
    } finally {
      setSettlingUp(null);
    }
  }

  async function handleShareInvite() {
    if (!group) return;
    setShareOpen(false);
    const link = `${window.location.origin}${window.location.pathname}`;
    const text = `Únete a mi grupo "${group.name}" en Splitter:\n1. Regístrate en ${link}\n2. En "Grupos", pulsa "Unirse a un grupo" e introduce el código ${group.inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Únete a ${group.name}`, text });
      } catch {
        /* user cancelled — no-op */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      show("Invitación copiada al portapapeles", "success");
    } catch {
      show("No se pudo compartir la invitación.", "error");
    }
  }

  async function handleShareSummary() {
    if (!group) return;
    setShareOpen(false);
    const lines = [
      `Resumen de "${group.name}"`,
      `Total gastado: ${formatCurrency(totalSpent, group.currency)}`,
      "",
      "Saldos:",
      ...activeMembers.map((m) => {
        const b = balances.find((x) => x.uid === m.uid);
        const net = b?.net ?? 0;
        return `- ${m.name}: ${formatSignedCurrency(net, group.currency)}`;
      }),
    ];
    if (settlement.length > 0) {
      lines.push("", "Liquidación recomendada:");
      for (const t of settlement) {
        const from = membersById.get(t.fromUid)?.name ?? "Alguien";
        const to = membersById.get(t.toUid)?.name ?? "Alguien";
        lines.push(`- ${from} → ${to}: ${formatCurrency(t.amount, group.currency)}`);
      }
    }
    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Resumen de ${group.name}`, text });
      } catch {
        /* user cancelled — no-op */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      show("Resumen copiado al portapapeles", "success");
    } catch {
      show("No se pudo compartir el resumen.", "error");
    }
  }

  async function handleDeleteExpense(expense: GroupExpense) {
    if (!user || !group) return;
    const groupId = group.id;
    const uid = user.uid;
    const actorName = membersById.get(uid)?.name ?? "Alguien";
    try {
      await deleteGroupExpense(groupId, expense.id);
      await logHistory(groupId, "expense_deleted", uid, actorName, `${actorName} eliminó "${expense.description}"`, expense.id);
      show("Gasto eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restoreGroupExpense(groupId, expense.id)
            .then(() => logHistory(groupId, "expense_added", uid, actorName, `${actorName} recuperó "${expense.description}"`, expense.id))
            .catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
      throw err; // lets the row slide back into place
    }
  }

  async function handleUnarchiveForMe() {
    if (!user || !group) return;
    try {
      await setGroupArchivedForMe(user.uid, group.id, false);
      show("El grupo vuelve a estar activo", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo desarchivar.", "error");
    }
  }

  async function handleRevert(paymentId: string) {
    if (!group) return;
    try {
      await revertPayment(group.id, paymentId);
      show("Pago revertido", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo revertir.", "error");
    }
  }

  const myTransfers = settlement.filter((t) => t.fromUid === user?.uid || t.toUid === user?.uid);
  const otherTransfers = settlement.filter((t) => t.fromUid !== user?.uid && t.toUid !== user?.uid);
  const nameOf = (uid: string) => (uid === user?.uid ? "Tú" : membersById.get(uid)?.name ?? "Alguien");
  const money = (value: number) => formatCurrency(value, group.currency);
  const settled = Math.abs(myBalance) < 0.005;

  const transferRow = (t: SettlementTransfer, i: number) => {
    const from = membersById.get(t.fromUid);
    const to = membersById.get(t.toUid);
    const iPay = t.fromUid === user?.uid;
    const iReceive = t.toUid === user?.uid;
    return (
      <li key={`${t.fromUid}-${t.toUid}-${i}`} className="flex items-center gap-3 px-4 py-3">
        <span className="flex shrink-0 items-center">
          <Avatar name={from?.name ?? "?"} color={from?.color ?? "#9CA3AF"} photoUrl={from?.photoUrl} size="sm" />
          <ArrowRight size={14} strokeWidth={2.2} className="mx-1 text-neutral-400 dark:text-neutral-500" aria-hidden />
          <Avatar name={to?.name ?? "?"} color={to?.color ?? "#9CA3AF"} photoUrl={to?.photoUrl} size="sm" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-medium leading-snug">
            {iPay ? `Pagas a ${to?.name ?? "alguien"}` : iReceive ? `${from?.name ?? "Alguien"} te paga` : `${from?.name} paga a ${to?.name}`}
          </span>
          <span className="block text-[15px] font-semibold tabular-nums">{money(t.amount)}</span>
        </span>
        {!isArchived && (
          <Button
            size="md"
            variant={iPay ? "primary" : "secondary"}
            className="!h-9 shrink-0 !px-3 text-[13px]"
            loading={settlingUp === t}
            disabled={settlingUp !== null}
            onClick={() => handleMarkPaid(t)}
            aria-label={`Marcar como pagados ${money(t.amount)} de ${from?.name ?? "alguien"} a ${to?.name ?? "alguien"}`}
          >
            {settlingUp !== t && <Check size={15} strokeWidth={2.6} />}
            Pagado
          </Button>
        )}
      </li>
    );
  };

  const memberRows = (withPaid: boolean) =>
    activeMembers.map((m) => {
      const b = balances.find((x) => x.uid === m.uid);
      if (!b) return null;
      const even = Math.abs(b.net) < 0.005;
      return (
        <li key={m.uid} className="flex items-center gap-3 px-4 py-3">
          <Avatar name={m.name} color={m.color} photoUrl={m.photoUrl} size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-medium">{m.uid === user?.uid ? "Tú" : m.name}</span>
              {m.uid === group.createdBy && <span className="shrink-0 text-[11px] text-neutral-500 dark:text-neutral-400">Admin</span>}
              {m.isGhost && <span className="shrink-0 text-[11px] text-neutral-500 dark:text-neutral-400">Sin cuenta</span>}
            </span>
            {withPaid && <span className="block text-xs text-neutral-500 dark:text-neutral-400">Ha pagado {money(b.paid)}</span>}
          </span>
          {addFriendAction(m)}
          <span className="shrink-0 text-right">
            {even ? (
              <span className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">Al día</span>
            ) : (
              <>
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{b.net > 0 ? "Le deben" : "Debe"}</span>
                <span className={`block text-[15px] font-semibold tabular-nums ${b.net > 0 ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"}`}>
                  {money(Math.abs(b.net))}
                </span>
              </>
            )}
          </span>
        </li>
      );
    });

  const expensesByMonth = (() => {
    const list: { month: string; items: GroupExpense[]; total: number }[] = [];
    for (const e of expenses) {
      const month = e.date.slice(0, 7);
      const last = list[list.length - 1];
      if (last?.month === month) {
        last.items.push(e);
        last.total += e.amount;
      } else list.push({ month, items: [e], total: e.amount });
    }
    return list;
  })();

  const historyByDay = (() => {
    const today = localISO(new Date());
    const yesterday = localISO(new Date(Date.now() - 86_400_000));
    const list: { day: string; label: string; items: typeof history }[] = [];
    for (const h of history) {
      const day = localISO(new Date(h.createdAt));
      const last = list[list.length - 1];
      if (last?.day === day) last.items.push(h);
      else list.push({ day, label: day === today ? "Hoy" : day === yesterday ? "Ayer" : formatDateLong(day), items: [h] });
    }
    return list;
  })();

  const listClass = "surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]";

  return (
    <>
      <TopBar
        title={group.name}
        onBack
        backTo="/grupos"
        right={
          <div className="flex items-center gap-2">
            <Button size="icon" variant="secondary" onClick={() => setShareOpen(true)} aria-label="Compartir" title="Compartir">
              <Share2 size={18} strokeWidth={2.1} />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setSettingsOpen(true)} aria-label="Ajustes del grupo">
              <SettingsIcon size={19} strokeWidth={2.1} />
            </Button>
          </div>
        }
      />
      <PageContainer>
        {isArchived ? (
          <div className="well mb-4 flex items-center gap-2.5 rounded-[18px] p-3.5 text-sm text-neutral-500 dark:text-neutral-400">
            <Archive size={16} strokeWidth={2} className="shrink-0" />
            Grupo cerrado por su administrador — solo puedes consultarlo.
          </div>
        ) : (
          isArchivedForMe && (
            <div className="well mb-4 flex items-center gap-2.5 rounded-[18px] py-2 pl-3.5 pr-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Archive size={16} strokeWidth={2} className="shrink-0" />
              <span className="min-w-0 flex-1">Lo tienes archivado.</span>
              <button
                type="button"
                onClick={handleUnarchiveForMe}
                className="pressable shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent dark:bg-accent/20 dark:text-accent-300"
              >
                Desarchivar
              </button>
            </div>
          )
        )}
        {error && (
          <div className="mb-4 rounded-[18px] bg-negative/10 p-3.5 text-sm text-negative dark:bg-negative/15">
            No se han podido cargar todos los datos del grupo: {error}
            <p className="mt-1 text-xs opacity-70">
              Si esto persiste, abre la consola del navegador (F12) — si el error menciona un índice de Firestore,
              sigue el enlace que ofrece para crearlo, o despliega los de <code>firestore.indexes.json</code> con{" "}
              <code>firebase deploy --only firestore:indexes</code>.
            </p>
          </div>
        )}

        {/* ---------------------------------------------- Where I stand */}
        <section className="hero-card mb-4 rounded-[28px] p-5">
          <div className="flex items-center gap-3">
            {GroupIcon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${group.color}26`, color: group.color }}>
                <GroupIcon size={21} strokeWidth={1.9} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{settled ? "Tu saldo" : myBalance > 0 ? "Te deben" : "Debes"}</span>
              <span
                className={`block text-[34px] font-semibold leading-tight tracking-[-0.035em] ${
                  settled ? "" : myBalance > 0 ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"
                }`}
              >
                {settled ? "Estás al día" : money(Math.abs(myBalance))}
              </span>
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-black/[0.07] pt-3.5 dark:border-white/10">
            <HeroFigure label="Gastado" value={money(totalSpent)} />
            <HeroFigure label="Gastos" value={String(expenses.length)} />
            <HeroFigure label="Personas" value={String(activeMembers.length)} />
          </dl>
        </section>

        <StickySubnav className="mb-3">
          <Segmented options={TABS} value={tab} onChange={setTab} label="Secciones del grupo" />
        </StickySubnav>

        {tab === "resumen" && (
          <div className="flex flex-col gap-6">
            {myTransfers.length > 0 && (
              <Section title="Para quedar en paz">
                <ul className={listClass}>{myTransfers.map(transferRow)}</ul>
              </Section>
            )}

            <Section
              title="Personas"
              action={
                isAdmin && !isArchived ? (
                  <button type="button" onClick={() => setAddingFriends(true)} className="pressable flex items-center gap-1 text-[13px] font-semibold text-accent dark:text-accent-300">
                    <UserPlus size={14} strokeWidth={2.3} />
                    Añadir
                  </button>
                ) : undefined
              }
            >
              <ul className={listClass}>{memberRows(true)}</ul>
            </Section>

            {expenses.length > 0 && (
              <Section
                title="Últimos gastos"
                action={
                  <button type="button" onClick={() => setTab("gastos")} className="text-[13px] font-semibold text-accent dark:text-accent-300">
                    Ver todos
                  </button>
                }
              >
                <div className="flex flex-col gap-2.5">
                  {expenses.slice(0, 3).map((e) => (
                    <GroupExpenseCard key={e.id} expense={e} members={membersById} currentUid={user?.uid ?? ""} onClick={() => setViewingExpenseId(e.id)} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "gastos" &&
          (expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin gastos todavía"
              description="Cada uno apunta lo que paga y la app reparte."
              action={
                !isArchived ? (
                  <Button onClick={() => setAddingExpense(true)}>
                    <Plus size={17} strokeWidth={2.5} />
                    Añadir gasto
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-5">
              {expensesByMonth.map(({ month, items, total }) => (
                <section key={month}>
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 className="eyebrow">{capitalize(formatMonth(`${month}-01`))}</h2>
                    <span className="text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">{money(total)}</span>
                  </div>
                  <div className="stagger flex flex-col gap-2.5">
                    {items.map((e) => (
                      <GroupExpenseCard
                        key={e.id}
                        expense={e}
                        members={membersById}
                        currentUid={user?.uid ?? ""}
                        onClick={() => setViewingExpenseId(e.id)}
                        onDelete={!isArchived && e.createdBy === user?.uid ? () => handleDeleteExpense(e) : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {expenses.some((e) => e.createdBy === user?.uid) && !isArchived && (
                <p className="px-1 text-center text-xs text-neutral-500 dark:text-neutral-400">Desliza a la izquierda un gasto tuyo para borrarlo.</p>
              )}
            </div>
          ))}

        {tab === "balance" && (
          <div className="flex flex-col gap-6">
            <Section title="Cómo quedar en paz">
              {settlement.length === 0 ? (
                <div className="surface flex flex-col items-center gap-1.5 rounded-[22px] px-6 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark">
                    <PartyPopper size={22} strokeWidth={1.8} />
                  </span>
                  <p className="mt-1 font-semibold">Todo está saldado</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Nadie le debe nada a nadie.</p>
                </div>
              ) : (
                <>
                  <ul className={listClass}>
                    {myTransfers.map(transferRow)}
                    {otherTransfers.map((t, i) => transferRow(t, i + myTransfers.length))}
                  </ul>
                  <p className="mt-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {settlement.length === 1 ? "Con este pago" : `Con estos ${settlement.length} pagos`} queda todo saldado, con el menor número de transferencias. Pulsa «Pagado» cuando se haya hecho.
                  </p>
                </>
              )}
            </Section>

            <Section title="Saldos">
              <ul className={listClass}>{memberRows(false)}</ul>
            </Section>

            {payments.length > 0 && (
              <Section title="Pagos registrados">
                <ul className={listClass}>
                  {payments.map((p) => {
                    const canRevert = !isArchived && p.createdBy === user?.uid;
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark">
                          <HandCoins size={17} strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {nameOf(p.fromUid)} → {nameOf(p.toUid)}
                          </span>
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400">{formatDate(localISO(new Date(p.createdAt)))}</span>
                        </span>
                        <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(p.amount)}</span>
                        {canRevert && (
                          <button
                            type="button"
                            onClick={() => handleRevert(p.id)}
                            aria-label={`Revertir el pago de ${money(p.amount)}`}
                            title="Revertir"
                            className="hit-slop pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full well well-press text-neutral-500 dark:text-neutral-400"
                          >
                            <Undo2 size={15} strokeWidth={2.1} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}
          </div>
        )}

        {tab === "historial" &&
          (history.length === 0 ? (
            <EmptyState icon={Clock} title="Sin actividad todavía" />
          ) : (
            <div className="flex flex-col gap-5">
              {historyByDay.map(({ day, label, items }) => (
                <section key={day}>
                  <h2 className="eyebrow mb-2 px-1">{capitalize(label)}</h2>
                  <ul className={listClass}>
                    {items.map((h) => {
                      const HistoryIcon = historyIcon(h.type);
                      return (
                        <li key={h.id} className="flex items-start gap-3 px-4 py-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full well text-neutral-500 dark:text-neutral-400">
                            <HistoryIcon size={14} strokeWidth={2.2} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm">{h.summary}</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">{TIME.format(new Date(h.createdAt))}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ))}
      </PageContainer>

      {/* The + adds to this group directly — no "personal or which group?" step. */}
      {!isArchived && <FAB onClick={() => setAddingExpense(true)} label="Añadir gasto al grupo" />}

      <GroupExpenseDetailSheet
        open={Boolean(viewingExpense)}
        onClose={() => setViewingExpenseId(null)}
        expense={viewingExpense}
        members={new Map(members.map((m) => [m.uid, m]))}
        currentUid={user?.uid ?? ""}
        canEdit={!isArchived && viewingExpense?.createdBy === user?.uid}
        onEdit={() => {
          if (viewingExpense) setEditingExpense(viewingExpense);
          setViewingExpenseId(null);
        }}
      />
      <GroupExpenseSheet
        open={addingExpense}
        onClose={() => setAddingExpense(false)}
        groupId={group.id}
        currency={group.currency}
        members={activeMembers}
      />
      <GroupExpenseSheet
        open={Boolean(editingExpense)}
        onClose={() => setEditingExpense(null)}
        groupId={group.id}
        currency={group.currency}
        members={activeMembers}
        expense={editingExpense ?? undefined}
      />
      <GroupSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        group={group}
        members={members}
        archivedForMe={isArchivedForMe}
        myBalance={myBalance}
      />
      <AddGroupFriendsSheet
        open={addingFriends}
        onClose={() => setAddingFriends(false)}
        groupId={group.id}
        existingMemberIds={group.memberIds}
      />

      <BottomSheet open={shareOpen} onClose={() => setShareOpen(false)} title="Compartir">
        <div className="flex flex-col gap-2 pb-2 pt-1">
          {!isArchived && (
            <button
              onClick={handleShareInvite}
              className="flex items-center gap-3 well rounded-[18px] p-3.5 text-left well-press"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
                <Link2 size={18} strokeWidth={2.1} />
              </span>
              <div>
                <p className="text-sm font-semibold">Código de invitación</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Para que alguien se una al grupo</p>
              </div>
            </button>
          )}
          <button
            onClick={handleShareSummary}
            className="flex items-center gap-3 well rounded-[18px] p-3.5 text-left well-press"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
              <BarChart3 size={18} strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-sm font-semibold">Resumen del grupo</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Total gastado y saldos de cada uno</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function historyIcon(type: string): LucideIcon {
  switch (type) {
    case "expense_added":
      return Plus;
    case "expense_edited":
      return Pencil;
    case "expense_deleted":
      return Trash2;
    case "member_joined":
      return UserPlus;
    case "member_left":
      return LogOut;
    case "member_removed":
      return UserMinus;
    case "member_renamed":
      return Pencil;
    case "payment_recorded":
      return HandCoins;
    case "payment_reverted":
      return Undo2;
    case "group_created":
      return Sparkles;
    case "invite_code_regenerated":
      return Link2;
    default:
      return Circle;
  }
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function HeroFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
