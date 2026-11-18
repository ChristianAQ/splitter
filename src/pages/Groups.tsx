import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, ChevronRight, Link2, Plus, UserPlus, Users } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { GroupList } from "../components/group/GroupList";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Card";
import { Collapsible } from "../components/ui/Collapsible";
import { BottomSheet } from "../components/ui/BottomSheet";
import { CreateGroupSheet } from "../components/group/CreateGroupSheet";
import { JoinGroupSheet } from "../components/group/JoinGroupSheet";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { setGroupArchivedForMe } from "../services/users.service";
import { useGroups } from "../hooks/useGroups";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { useFriends } from "../hooks/useFriends";
import { groupIconComponent } from "../lib/groupIcons";
import { formatCurrency } from "../lib/format";
import type { Friend, Group } from "../types";

/**
 * Grupos: where I stand across all my groups at a glance, my friends one
 * tap away, and the groups themselves — the ones with money still to settle
 * first. Creating and joining live behind a single "+".
 */
export function Groups() {
  const { profile } = useAuth();
  const { show } = useToast();
  const { groups, archivedGroups, archivedForMeIds, loading } = useGroups();
  const { friends, loading: friendsLoading } = useFriends();
  const allGroups = useMemo(() => [...groups, ...archivedGroups], [groups, archivedGroups]);
  const summaries = useGroupsSummary(allGroups, profile?.uid);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = profile?.currency ?? "EUR";

  useEffect(() => {
    if (searchParams.get("crear") === "1") {
      setCreating(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { pending, settled } = useMemo(() => {
    const isSettled = (g: Group) => Math.abs(summaries[g.id]?.balance ?? 0) < 0.005;
    return {
      pending: groups.filter((g) => !isSettled(g)),
      settled: groups.filter((g) => isSettled(g)),
    };
  }, [groups, summaries]);

  // Across active groups in my currency (no exchange rates to add the rest).
  const totals = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const g of groups) {
      if (g.currency !== currency) continue;
      const b = summaries[g.id]?.balance ?? 0;
      if (b > 0.004) owed += b;
      else if (b < -0.004) owe -= b;
    }
    return { owed, owe };
  }, [groups, summaries, currency]);

  async function handleArchiveForMe(group: Group, archived: boolean) {
    if (!profile) return;
    try {
      await setGroupArchivedForMe(profile.uid, group.id, archived);
      show(archived ? `«${group.name}» archivado` : `«${group.name}» vuelve a estar activo`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    }
  }

  const sharedGroups = useMemo(
    () => (selectedFriend ? allGroups.filter((g) => g.memberIds.includes(selectedFriend.uid)) : []),
    [allGroups, selectedFriend]
  );

  const hasNoGroupsAtAll = groups.length === 0 && archivedGroups.length === 0;
  const iconButton = "hit-slop pressable flex h-9 w-9 items-center justify-center rounded-full well well-press text-neutral-500 dark:text-neutral-400";

  return (
    <>
      <TopBar
        title="Grupos"
        right={
          <div className="flex gap-2">
            <Link to="/amigos" aria-label="Amigos" className="well well-press pressable flex h-11 w-11 items-center justify-center rounded-full text-neutral-900 dark:text-neutral-50">
              <UserPlus size={19} strokeWidth={2.1} />
            </Link>
            <Button size="icon" onClick={() => setAdding(true)} aria-label="Crear o unirse a un grupo">
              <Plus size={20} strokeWidth={2.25} />
            </Button>
          </div>
        }
      />
      <PageContainer>
        {loading ? (
          <CardListSkeleton />
        ) : hasNoGroupsAtAll ? (
          <EmptyState
            icon={Users}
            title="Comparte gastos con un grupo"
            description="Viajes, pisos compartidos, cenas con amigos... cada uno apunta lo que paga y la app hace las cuentas."
            action={
              <div className="flex gap-2">
                <Button onClick={() => setCreating(true)}>Crear grupo</Button>
                <Button variant="secondary" onClick={() => setJoining(true)}>
                  Unirme con código
                </Button>
              </div>
            }
          />
        ) : (
          <div className="stagger flex flex-col gap-6">
            {/* ------------------------------------------ Where I stand */}
            {groups.length > 0 && (
              <div className="surface grid grid-cols-2 divide-x divide-black/[0.06] rounded-[26px] dark:divide-white/[0.08]">
                <div className="p-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Te deben</p>
                  <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${totals.owed > 0.004 ? "text-positive dark:text-positive-dark" : ""}`}>
                    {formatCurrency(totals.owed, currency)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Debes</p>
                  <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${totals.owe > 0.004 ? "text-negative dark:text-negative-dark" : ""}`}>
                    {formatCurrency(totals.owe, currency)}
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------ Friends */}
            <section>
              <div className="mb-2.5 flex items-baseline justify-between px-1">
                <h2 className="text-[17px] font-semibold tracking-tight">Amigos</h2>
                <Link to="/amigos" className="text-[13px] font-semibold text-accent dark:text-accent-300">
                  {friends.length > 0 ? "Ver todos" : "Añadir"}
                </Link>
              </div>
              {friendsLoading ? (
                <CardListSkeleton count={1} />
              ) : (
                <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1">
                  <Link to="/amigos" className="pressable flex w-[60px] shrink-0 flex-col items-center gap-1.5" aria-label="Añadir amigo">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-accent/40 text-accent dark:text-accent-300">
                      <Plus size={20} strokeWidth={2.2} />
                    </span>
                    <span className="w-full truncate text-center text-xs font-medium text-neutral-600 dark:text-neutral-300">Añadir</span>
                  </Link>
                  {friends.map((f) => (
                    <button key={f.uid} type="button" onClick={() => setSelectedFriend(f)} className="pressable flex w-[60px] shrink-0 flex-col items-center gap-1.5">
                      <span className="flex h-12 w-12 items-center justify-center">
                        <Avatar name={f.name} color={f.color} photoUrl={f.photoUrl} size="md" />
                      </span>
                      <span className="w-full truncate text-center text-xs font-medium text-neutral-600 dark:text-neutral-300">{f.name.split(" ")[0]}</span>
                    </button>
                  ))}
                  {friends.length === 0 && (
                    <p className="flex items-center pl-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Añade amigos para meterlos en un grupo sin código.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ------------------------------------------ Groups */}
            {pending.length > 0 && (
              <section>
                <h2 className="mb-2.5 px-1 text-[17px] font-semibold tracking-tight">Por liquidar</h2>
                <GroupList groups={pending} balances={summaries} />
              </section>
            )}

            {settled.length > 0 && (
              <section>
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                  <h2 className="text-[17px] font-semibold tracking-tight">Al día</h2>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Archívalos cuando terminéis</span>
                </div>
                <GroupList
                  groups={settled}
                  balances={summaries}
                  trailing={(g) => (
                    <button
                      type="button"
                      // Not until this group's balance has actually loaded —
                      // every group reads as "settled" for a moment before.
                      disabled={!summaries[g.id]}
                      onClick={() => handleArchiveForMe(g, true)}
                      aria-label={`Archivar ${g.name}`}
                      title="Archivar"
                      className={`${iconButton} disabled:opacity-30`}
                    >
                      <Archive size={16} strokeWidth={2} />
                    </button>
                  )}
                />
              </section>
            )}

            {archivedGroups.length > 0 && (
              <Collapsible title={`Archivados · ${archivedGroups.length}`} defaultOpen={false}>
                <GroupList
                  groups={archivedGroups}
                  balances={summaries}
                  archived={() => true}
                  trailing={(g) =>
                    // Only the personal archive can be undone — a group its
                    // admin closed for everyone stays closed.
                    g.archivedAt ? undefined : (
                      <button type="button" onClick={() => handleArchiveForMe(g, false)} aria-label={`Desarchivar ${g.name}`} title="Desarchivar" className={iconButton}>
                        <ArchiveRestore size={16} strokeWidth={2} />
                      </button>
                    )
                  }
                />
              </Collapsible>
            )}
          </div>
        )}
      </PageContainer>

      {/* ---------------------------------------------- Create or join */}
      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Nuevo grupo">
        <div className="flex flex-col gap-2 pb-2 pt-1">
          <ChoiceRow
            icon={<Plus size={19} strokeWidth={2.1} />}
            title="Crear un grupo"
            detail="Para un viaje, un piso, una cena..."
            onClick={() => {
              setAdding(false);
              setCreating(true);
            }}
          />
          <ChoiceRow
            icon={<Link2 size={19} strokeWidth={2.1} />}
            title="Unirme con un código"
            detail="Si alguien te ha pasado el código de su grupo"
            onClick={() => {
              setAdding(false);
              setJoining(true);
            }}
          />
        </div>
      </BottomSheet>

      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
      <JoinGroupSheet open={joining} onClose={() => setJoining(false)} />

      {/* ---------------------------------------------- A friend */}
      <BottomSheet open={Boolean(selectedFriend)} onClose={() => setSelectedFriend(null)} title={selectedFriend?.name}>
        {selectedFriend && (
          <div className="flex flex-col gap-3 pb-2 pt-1">
            <p className="px-1 text-sm text-neutral-500 dark:text-neutral-400">
              {sharedGroups.length === 0
                ? "Todavía no compartís ningún grupo."
                : `Compartís ${sharedGroups.length} grupo${sharedGroups.length === 1 ? "" : "s"}.`}
            </p>
            {sharedGroups.length > 0 && (
              <div className="well divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
                {sharedGroups.map((g) => {
                  const GroupIcon = groupIconComponent(g.icon);
                  return (
                    <Link
                      key={g.id}
                      to={`/grupos/${g.id}`}
                      onClick={() => setSelectedFriend(null)}
                      className="well-press flex items-center gap-3 px-4 py-3 first:rounded-t-[22px] last:rounded-b-[22px]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${g.color}22`, color: g.color }}>
                        <GroupIcon size={17} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{g.name}</span>
                      {(g.archivedAt || archivedForMeIds.has(g.id)) && <Badge>Archivado</Badge>}
                      <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function ChoiceRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="well well-press pressable flex w-full items-center gap-3 rounded-[22px] p-4 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-neutral-500 dark:text-neutral-400">{detail}</span>
      </span>
      <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
    </button>
  );
}
