import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, Link2, Plus, UserPlus, Users } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { GroupCard } from "../components/group/GroupCard";
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
import type { Friend, Group } from "../types";

export function Groups() {
  const { profile } = useAuth();
  const { show } = useToast();
  const { groups, archivedGroups, archivedForMeIds, loading } = useGroups();
  const { friends, loading: friendsLoading } = useFriends();
  const allGroups = useMemo(() => [...groups, ...archivedGroups], [groups, archivedGroups]);
  const summaries = useGroupsSummary(allGroups, profile?.uid);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <>
      <TopBar
        title="Grupos"
        right={
          <div className="flex gap-2">
            <Link
              to="/amigos"
              aria-label="Amigos"
              className="well well-press pressable flex h-11 w-11 items-center justify-center rounded-full text-neutral-900 dark:text-neutral-50"
            >
              <UserPlus size={19} strokeWidth={2.1} />
            </Link>
            <Button size="icon" variant="secondary" onClick={() => setJoining(true)} aria-label="Unirse a un grupo">
              <Link2 size={19} strokeWidth={2.1} />
            </Button>
            <Button size="icon" onClick={() => setCreating(true)} aria-label="Crear grupo">
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
            title="Crea un grupo para compartir gastos"
            description="Viajes, pisos compartidos, cenas con amigos... comparte los gastos sin complicaciones."
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
          <div className="flex flex-col gap-6">
            <Collapsible
              title={`Amigos (${friends.length})`}
              headerRight={
                <Link to="/amigos" className="shrink-0 text-sm font-semibold text-accent">
                  Ver todos
                </Link>
              }
            >
              {friendsLoading ? (
                <CardListSkeleton count={1} />
              ) : friends.length === 0 ? (
                <Link
                  to="/amigos"
                  className="flex items-center gap-3 surface rounded-[22px] p-4 pressable"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
                    <UserPlus size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="font-semibold">Añade a tus amigos</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Así podrás incluirlos en un grupo sin código</p>
                  </div>
                </Link>
              ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-0.5 py-1">
                  {friends.map((f) => (
                    <button
                      key={f.uid}
                      type="button"
                      onClick={() => setSelectedFriend(f)}
                      className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform duration-150 active:scale-90"
                    >
                      <Avatar name={f.name} color={f.color} photoUrl={f.photoUrl} size="md" />
                      <span className="w-full truncate text-center text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Collapsible>

            {(pending.length > 0 || settled.length > 0) && (
              <Collapsible title="Activo">
                <div className="flex flex-col gap-4">
                  {pending.length > 0 && (
                    <div>
                      <h3 className="mb-2 eyebrow">
                        Pendientes de liquidar ({pending.length})
                      </h3>
                      <div className="stagger flex flex-col gap-2.5">
                        {pending.map((g) => (
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
                    </div>
                  )}

                  {settled.length > 0 && (
                    <div>
                      <h3 className="mb-2 eyebrow">Saldados ({settled.length})</h3>
                      <div className="stagger flex flex-col gap-2.5">
                        {settled.map((g) => (
                          <div key={g.id} className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <GroupCard
                                groupId={g.id}
                                name={g.name}
                                icon={g.icon}
                                color={g.color}
                                balance={summaries[g.id]?.balance ?? 0}
                                currency={g.currency}
                              />
                            </div>
                            <button
                              type="button"
                              // Not until this group's balance has actually loaded —
                              // every group reads as "settled" for a moment before.
                              disabled={!summaries[g.id]}
                              onClick={() => handleArchiveForMe(g, true)}
                              aria-label={`Archivar ${g.name}`}
                              title="Archivar"
                              className="well well-press pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400"
                            >
                              <Archive size={17} strokeWidth={2} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Collapsible>
            )}

            {archivedGroups.length > 0 && (
              <Collapsible title={`Archivado (${archivedGroups.length})`} defaultOpen={false}>
                <div className="flex flex-col gap-2.5">
                  {archivedGroups.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <GroupCard
                          groupId={g.id}
                          name={g.name}
                          icon={g.icon}
                          color={g.color}
                          balance={summaries[g.id]?.balance ?? 0}
                          currency={g.currency}
                          archived
                        />
                      </div>
                      {/* Only the personal archive can be undone — a group its
                       * admin closed for everyone stays closed. */}
                      {!g.archivedAt && (
                        <button
                          type="button"
                          onClick={() => handleArchiveForMe(g, false)}
                          aria-label={`Desarchivar ${g.name}`}
                          title="Desarchivar"
                          className="well well-press pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400"
                        >
                          <ArchiveRestore size={17} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}
          </div>
        )}
      </PageContainer>

      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
      <JoinGroupSheet open={joining} onClose={() => setJoining(false)} />

      <BottomSheet open={Boolean(selectedFriend)} onClose={() => setSelectedFriend(null)} title={selectedFriend?.name}>
        {selectedFriend && (
          <div className="flex flex-col gap-2.5 pb-2">
            {sharedGroups.length === 0 ? (
              <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">Todavía no compartís ningún grupo.</p>
            ) : (
              sharedGroups.map((g) => {
                const GroupIcon = groupIconComponent(g.icon);
                return (
                  <Link
                    key={g.id}
                    to={`/grupos/${g.id}`}
                    onClick={() => setSelectedFriend(null)}
                    className="flex items-center gap-3 well rounded-[18px] p-3.5 pressable"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${g.color}22`, color: g.color }}
                    >
                      <GroupIcon size={18} strokeWidth={1.8} />
                    </span>
                    <p className="flex-1 truncate font-semibold">{g.name}</p>
                    {(g.archivedAt || archivedForMeIds.has(g.id)) && <Badge>Archivado</Badge>}
                  </Link>
                );
              })
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
