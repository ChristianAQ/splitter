import { useMemo, useState } from "react";
import { ChevronRight, HandCoins, Plus } from "lucide-react";
import { DebtCard } from "./DebtCard";
import { DebtSheet } from "./DebtSheet";
import { DebtDetailSheet } from "./DebtDetailSheet";
import { PersonDebtSheet } from "./PersonDebtSheet";
import { Avatar } from "../ui/Avatar";
import { CardListSkeleton } from "../ui/Skeleton";
import { Collapsible } from "../ui/Collapsible";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebts } from "../../hooks/useDebts";
import { useFriends } from "../../hooks/useFriends";
import { deleteDebt, restoreDebt, setDebtProgress } from "../../services/debts.service";
import { dueLabel, isSettled, reopenDebt, sortDebts } from "../../domain/debts";
import { balancesByPerson, netTotals, personKey, type PersonBalance } from "../../domain/debtPeople";
import { todayISO } from "../../domain/date";
import { formatCurrency, formatDate } from "../../lib/format";
import { USER_COLOR_PALETTE } from "../../lib/userColors";
import type { Debt } from "../../types";

/**
 * "Deudas": money between the user and other people, shown per person
 * rather than per entry. Several debts with the same person — in either
 * direction — add up to one line and one payment: who pays whom, how much.
 * The individual entries are one tap further in.
 */
export function DebtsTab() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { debts, loading, error } = useDebts();
  const { friends } = useFriends();
  const [personKeyOpen, setPersonKeyOpen] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // undefined = form closed, null = new, string = editing that entry.
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [newWith, setNewWith] = useState("");
  const today = todayISO();
  const currency = profile?.currency ?? "EUR";

  const people = useMemo(() => balancesByPerson(debts, today), [debts, today]);
  const totals = useMemo(() => netTotals(people, currency), [people, currency]);
  const settled = useMemo(() => sortDebts(debts.filter(isSettled)), [debts]);
  const overdue = people.filter((p) => p.overdue).length;

  const person = personKeyOpen ? people.find((p) => p.key === personKeyOpen) : undefined;
  const viewingDebt = viewingId ? debts.find((d) => d.id === viewingId) : undefined;
  const editingDebt = typeof editing === "string" ? debts.find((d) => d.id === editing) : undefined;

  // A friend's own color and photo when the name matches one; otherwise a
  // color picked from the name, so the same person always looks the same.
  function avatarFor(name: string) {
    const key = personKey(name);
    const friend = friends.find((f) => personKey(f.name) === key);
    if (friend) return { color: friend.color, photoUrl: friend.photoUrl };
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return { color: USER_COLOR_PALETTE[hash % USER_COLOR_PALETTE.length].value };
  }

  function openPerson(p: PersonBalance) {
    // One entry: nothing to add up, go straight to it.
    if (p.debts.length === 1) setViewingId(p.debts[0].id);
    else setPersonKeyOpen(p.key);
  }

  function startNew(withPerson = "") {
    setNewWith(withPerson);
    setEditing(null);
  }

  async function handleReopen(debt: Debt) {
    if (!user) return;
    try {
      await setDebtProgress(user.uid, debt.id, reopenDebt(debt));
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    }
  }

  async function handleDelete(debt: Debt) {
    if (!user) return;
    const uid = user.uid;
    try {
      await deleteDebt(uid, debt.id);
      show("Eliminado", "default", {
        label: "Deshacer",
        onClick: () => {
          restoreDebt(uid, debt).catch((err) => show(err instanceof Error ? err.message : "No se pudo recuperar.", "error"));
        },
      });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
      throw err; // lets the row slide back into place
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <p className="rounded-[22px] bg-negative/10 p-4 text-sm text-negative">No se han podido cargar tus deudas: {error}</p>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nada apuntado"
          description="Dinero que te han prestado o que has prestado tú. Si hay varias cosas con la misma persona, te hago la cuenta."
          action={
            <Button onClick={() => startNew()}>
              <Plus size={17} strokeWidth={2.5} />
              Apuntar algo
            </Button>
          }
        />
      ) : (
        <>
          <div className="surface grid grid-cols-2 divide-x divide-black/[0.06] rounded-[26px] dark:divide-white/[0.08]">
            <div className="p-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Debes</p>
              <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${totals.iOwe > 0 ? "text-negative dark:text-negative-dark" : ""}`}>
                {formatCurrency(totals.iOwe, currency)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Te deben</p>
              <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${totals.owedToMe > 0 ? "text-positive dark:text-positive-dark" : ""}`}>
                {formatCurrency(totals.owedToMe, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="eyebrow">
              {people.length === 0 ? "Todo saldado" : `${people.length} persona${people.length === 1 ? "" : "s"}`}
              {overdue > 0 && (
                <span className="ml-1.5 text-negative dark:text-negative-dark">
                  · {overdue} con algo vencido
                </span>
              )}
            </h2>
            <button
              onClick={() => startNew()}
              aria-label="Apuntar deuda o préstamo"
              className="hit-slop pressable flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300"
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          </div>

          {people.length > 0 && (
            <div className="surface stagger divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
              {people.map((p) => {
                const iPay = p.net < 0;
                const even = Math.abs(p.net) < 0.005;
                const avatar = avatarFor(p.name);
                const paid = iPay ? p.repaid : p.collected;
                const due = p.nextDue ? dueLabel({ ...p.debts[0], dueDate: p.nextDue }, today) ?? `Vence el ${formatDate(p.nextDue)}` : null;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => openPerson(p)}
                    className="well-press flex w-full items-center gap-3 px-4 py-3.5 text-left first:rounded-t-[22px] last:rounded-b-[22px]"
                  >
                    <Avatar name={p.name} color={avatar.color} photoUrl={avatar.photoUrl} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                      <span className={`block truncate text-xs ${p.overdue ? "font-medium text-negative dark:text-negative-dark" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {[p.debts.length > 1 ? `${p.debts.length} apuntes` : p.debts[0].concept, due].filter(Boolean).join(" · ") || "Sin fecha"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{even ? "En paz" : iPay ? "Le debes" : "Te debe"}</span>
                      <span
                        className={`block text-[15px] font-semibold tabular-nums ${
                          even ? "text-neutral-400" : iPay ? "text-negative dark:text-negative-dark" : "text-positive dark:text-positive-dark"
                        }`}
                      >
                        {formatCurrency(Math.abs(p.net), p.currency)}
                      </span>
                      {!even && paid > 0 && (
                        <span className="block text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {formatCurrency(paid, p.currency)} ya {iPay ? "devueltos" : "cobrados"}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}

          {settled.length > 0 && (
            <Collapsible title={`Saldadas · ${settled.length}`} defaultOpen={false}>
              <div className="flex flex-col gap-2.5">
                {settled.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    today={today}
                    onClick={() => setViewingId(d.id)}
                    onToggleSettled={() => handleReopen(d)}
                    onDelete={() => handleDelete(d)}
                  />
                ))}
              </div>
            </Collapsible>
          )}
        </>
      )}

      <PersonDebtSheet
        open={Boolean(person) && person!.debts.length > 0}
        onClose={() => setPersonKeyOpen(null)}
        person={person}
        avatar={avatarFor(person?.name ?? "")}
        onOpenDebt={(id) => {
          setViewingId(id);
          setPersonKeyOpen(null);
        }}
        onAdd={() => {
          startNew(person?.name ?? "");
          setPersonKeyOpen(null);
        }}
      />
      <DebtDetailSheet
        open={Boolean(viewingDebt)}
        onClose={() => setViewingId(null)}
        debt={viewingDebt}
        onEdit={() => {
          setEditing(viewingId);
          setViewingId(null);
        }}
      />
      <DebtSheet open={editing !== undefined} onClose={() => setEditing(undefined)} debt={editingDebt} initialPerson={newWith} />
    </div>
  );
}
