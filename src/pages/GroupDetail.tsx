import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Archive,
  BarChart3,
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
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { BottomSheet } from "../components/ui/BottomSheet";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { BalanceRow } from "../components/group/BalanceRow";
import { PaymentCard } from "../components/group/PaymentCard";
import { GroupExpenseCard } from "../components/expense/GroupExpenseCard";
import { GroupExpenseSheet } from "../components/expense/GroupExpenseSheet";
import { GroupSettingsSheet } from "../components/group/GroupSettingsSheet";
import { AddGroupFriendsSheet } from "../components/group/AddGroupFriendsSheet";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { useFriends } from "../hooks/useFriends";
import { useGroups } from "../hooks/useGroups";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatSignedCurrency } from "../lib/format";
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
  ["balance", "Balance"],
  ["historial", "Historial"],
];

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { group, members, activeMembers, expenses, payments, history, balances, settlement, loading, notFound, error } = useGroupDetail(groupId);
  const { friends } = useFriends();
  const { archivedForMeIds } = useGroups();
  const [tab, setTab] = useState<Tab>("resumen");
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
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full pressable bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
      >
        <UserPlus size={13} strokeWidth={2.2} />
      </button>
    );
  }

  if (notFound) {
    return (
      <>
        <TopBar title="Grupo" onBack />
        <ErrorState message="Este grupo ya no existe o no tienes acceso a él." />
      </>
    );
  }

  if (loading || !group) {
    return (
      <>
        <TopBar title="Cargando…" onBack />
        <PageContainer>
          <CardListSkeleton />
        </PageContainer>
      </>
    );
  }

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

  return (
    <>
      <TopBar
        title={
          <span className="inline-flex items-center gap-1.5">
            {GroupIcon && <GroupIcon size={18} strokeWidth={2} className="shrink-0" style={{ color: group.color }} />}
            {group.name}
          </span>
        }
        onBack
        right={
          <div className="flex items-center gap-2">
            {isAdmin && !isArchived && (
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setAddingFriends(true)}
                aria-label="Añadir amigos al grupo"
                title="Añadir amigos"
              >
                <UserPlus size={18} strokeWidth={2.1} className="text-accent" />
              </Button>
            )}
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
        <Segmented options={TABS} value={tab} onChange={setTab} className="mb-5" label="Secciones del grupo" />

        {tab === "resumen" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total gastado</p>
                <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{formatCurrency(totalSpent, group.currency)}</p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tu balance</p>
                <p className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${myBalance >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatSignedCurrency(myBalance, group.currency)}
                </p>
              </Card>
            </div>

            {!isArchived && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setAddingExpense(true)}>
                  Añadir gasto
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => setTab("balance")}>
                  Liquidar
                </Button>
              </div>
            )}

            <Card>
              <p className="mb-1 eyebrow">Participantes</p>
              <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {activeMembers.map((m) => {
                  const b = balances.find((x) => x.uid === m.uid);
                  return b ? (
                    <BalanceRow key={m.uid} member={m} balance={b} currency={group.currency} action={addFriendAction(m)} showPaid />
                  ) : null;
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "gastos" &&
          (expenses.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin gastos todavía" description="Añade el primer gasto de este grupo." />
          ) : (
            <div className="stagger flex flex-col gap-2.5">
              {expenses.map((e) => (
                <GroupExpenseCard
                  key={e.id}
                  expense={e}
                  members={membersById}
                  currentUid={user?.uid ?? ""}
                  onClick={isArchived ? undefined : () => setEditingExpense(e)}
                  onDelete={!isArchived && e.createdBy === user?.uid ? () => handleDeleteExpense(e) : undefined}
                />
              ))}
            </div>
          ))}

        {tab === "balance" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 eyebrow">Saldos</p>
              <Card>
                <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {activeMembers.map((m) => {
                    const b = balances.find((x) => x.uid === m.uid);
                    return b ? (
                      <BalanceRow key={m.uid} member={m} balance={b} currency={group.currency} action={addFriendAction(m)} />
                    ) : null;
                  })}
                </div>
              </Card>
            </div>

            <div>
              <p className="mb-2 eyebrow">Liquidar</p>
              {settlement.length === 0 ? (
                <EmptyState icon={PartyPopper} title="Todo está saldado" />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {settlement.map((t, i) => {
                    const from = membersById.get(t.fromUid);
                    const to = membersById.get(t.toUid);
                    return (
                      <Card key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {from?.name} → {to?.name}
                          </p>
                          <p className="text-lg font-semibold tracking-tight tabular-nums">{formatCurrency(t.amount, group.currency)}</p>
                        </div>
                        {!isArchived && (
                          <Button
                            size="md"
                            loading={settlingUp === t}
                            disabled={settlingUp !== null}
                            onClick={() => handleMarkPaid(t)}
                          >
                            Marcar pagado
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <div>
                <p className="mb-2 eyebrow">Pagos registrados</p>
                <div className="flex flex-col gap-2.5">
                  {payments.map((p) => (
                    <PaymentCard
                      key={p.id}
                      payment={p}
                      members={membersById}
                      canRevert={!isArchived && p.createdBy === user?.uid}
                      onRevert={() => handleRevert(p.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "historial" &&
          (history.length === 0 ? (
            <EmptyState icon={Clock} title="Sin actividad todavía" />
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h) => {
                const HistoryIcon = historyIcon(h.type);
                return (
                  <div key={h.id} className="flex items-start gap-3 surface rounded-[22px] p-3.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full well text-neutral-500 dark:text-neutral-400">
                      <HistoryIcon size={14} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{h.summary}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(localISO(new Date(h.createdAt)))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </PageContainer>

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
