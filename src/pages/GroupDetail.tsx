import { useState } from "react";
import { useParams } from "react-router-dom";
import { Settings as SettingsIcon, Share2, UserPlus } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { BalanceRow } from "../components/group/BalanceRow";
import { PaymentCard } from "../components/group/PaymentCard";
import { GroupExpenseCard } from "../components/expense/GroupExpenseCard";
import { GroupExpenseSheet } from "../components/expense/GroupExpenseSheet";
import { GroupSettingsSheet } from "../components/group/GroupSettingsSheet";
import { useAuth } from "../context/AuthContext";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatSignedCurrency } from "../lib/format";
import { recordPayment, revertPayment } from "../services/payments.service";
import { logHistory } from "../services/history.service";
import type { GroupExpense, SettlementTransfer } from "../types";

type Tab = "resumen" | "gastos" | "balance" | "historial";

const TABS: [Tab, string][] = [
  ["resumen", "Resumen"],
  ["gastos", "Gastos"],
  ["balance", "Balance"],
  ["historial", "Historial"],
];

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { show } = useToast();
  const { group, members, activeMembers, expenses, payments, history, balances, settlement, loading, notFound, error } = useGroupDetail(groupId);
  const [tab, setTab] = useState<Tab>("resumen");
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settlingUp, setSettlingUp] = useState<SettlementTransfer | null>(null);

  const membersById = new Map(activeMembers.map((m) => [m.uid, m]));

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
    if (!user || !group) return;
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
    const lines = [
      `Resumen de "${group.name}" (${group.icon})`,
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
        title={`${group.icon} ${group.name}`}
        onBack
        right={
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={handleShareInvite}
              aria-label="Compartir invitación al grupo"
              title="Invitar al grupo"
            >
              <UserPlus size={18} strokeWidth={2.1} className="text-accent" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleShareSummary}
              aria-label="Compartir resumen del grupo"
              title="Compartir resumen"
            >
              <Share2 size={18} strokeWidth={2.1} />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setSettingsOpen(true)} aria-label="Ajustes del grupo">
              <SettingsIcon size={19} strokeWidth={2.1} />
            </Button>
          </div>
        }
      />
      <PageContainer>
        {error && (
          <div className="mb-4 rounded-2xl bg-negative-light p-3.5 text-sm text-negative dark:bg-negative/15">
            No se han podido cargar todos los datos del grupo: {error}
            <p className="mt-1 text-xs opacity-70">
              Si esto persiste, abre la consola del navegador (F12) — si el error menciona un índice de Firestore,
              sigue el enlace que ofrece para crearlo, o despliega los de <code>firestore.indexes.json</code> con{" "}
              <code>firebase deploy --only firestore:indexes</code>.
            </p>
          </div>
        )}
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === key ? "bg-accent text-white" : "bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "resumen" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total gastado</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalSpent, group.currency)}</p>
              </Card>
              <Card>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tu balance</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${myBalance >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatSignedCurrency(myBalance, group.currency)}
                </p>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setAddingExpense(true)}>
                Añadir gasto
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setTab("balance")}>
                Liquidar
              </Button>
            </div>

            <Card>
              <p className="mb-1 text-sm font-bold text-neutral-500 dark:text-neutral-400">Participantes</p>
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {activeMembers.map((m) => {
                  const b = balances.find((x) => x.uid === m.uid);
                  return b ? <BalanceRow key={m.uid} member={m} balance={b} currency={group.currency} /> : null;
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "gastos" &&
          (expenses.length === 0 ? (
            <EmptyState icon="💸" title="Sin gastos todavía" description="Añade el primer gasto de este grupo." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {expenses.map((e) => (
                <GroupExpenseCard
                  key={e.id}
                  expense={e}
                  members={membersById}
                  currentUid={user?.uid ?? ""}
                  onClick={() => setEditingExpense(e)}
                />
              ))}
            </div>
          ))}

        {tab === "balance" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Saldos</p>
              <Card>
                <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                  {activeMembers.map((m) => {
                    const b = balances.find((x) => x.uid === m.uid);
                    return b ? <BalanceRow key={m.uid} member={m} balance={b} currency={group.currency} /> : null;
                  })}
                </div>
              </Card>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Liquidar</p>
              {settlement.length === 0 ? (
                <EmptyState icon="🎉" title="Todo está saldado" />
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
                          <p className="text-lg font-bold tabular-nums">{formatCurrency(t.amount, group.currency)}</p>
                        </div>
                        <Button
                          size="md"
                          loading={settlingUp === t}
                          onClick={() => handleMarkPaid(t)}
                        >
                          Marcar pagado
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Pagos registrados</p>
                <div className="flex flex-col gap-2.5">
                  {payments.map((p) => (
                    <PaymentCard
                      key={p.id}
                      payment={p}
                      members={membersById}
                      canRevert={p.createdBy === user?.uid}
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
            <EmptyState icon="🕓" title="Sin actividad todavía" />
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-card dark:bg-surface-dark-subtle">
                  <span className="mt-0.5 text-lg">{historyIcon(h.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{h.summary}</p>
                    <p className="text-xs text-neutral-400">{formatDate(new Date(h.createdAt).toISOString().slice(0, 10))}</p>
                  </div>
                </div>
              ))}
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
      <GroupSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} group={group} members={members} />
    </>
  );
}

function historyIcon(type: string): string {
  switch (type) {
    case "expense_added":
      return "➕";
    case "expense_edited":
      return "✏️";
    case "expense_deleted":
      return "🗑️";
    case "member_joined":
      return "👋";
    case "member_left":
      return "🚪";
    case "member_removed":
      return "⛔️";
    case "member_renamed":
      return "✏️";
    case "payment_recorded":
      return "💸";
    case "payment_reverted":
      return "↩️";
    case "group_created":
      return "✨";
    case "invite_code_regenerated":
      return "🔗";
    default:
      return "•";
  }
}
