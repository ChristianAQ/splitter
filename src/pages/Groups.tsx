import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Plus, UserPlus, Users } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { GroupCard } from "../components/group/GroupCard";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { CreateGroupSheet } from "../components/group/CreateGroupSheet";
import { JoinGroupSheet } from "../components/group/JoinGroupSheet";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../hooks/useGroups";
import { useGroupsSummary } from "../hooks/useGroupsSummary";
import { useFriends } from "../hooks/useFriends";
import type { Group } from "../types";

const FRIENDS_PREVIEW_COUNT = 5;

export function Groups() {
  const { profile } = useAuth();
  const { groups, archivedGroups, loading } = useGroups();
  const { friends, loading: friendsLoading } = useFriends();
  const allGroups = useMemo(() => [...groups, ...archivedGroups], [groups, archivedGroups]);
  const summaries = useGroupsSummary(allGroups, profile?.uid);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const { pending, settled } = useMemo(() => {
    const isSettled = (g: Group) => Math.abs(summaries[g.id]?.balance ?? 0) < 0.005;
    return {
      pending: groups.filter((g) => !isSettled(g)),
      settled: groups.filter((g) => isSettled(g)),
    };
  }, [groups, summaries]);

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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:active:bg-neutral-700"
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
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Amigos ({friends.length})</h2>
                <Link to="/amigos" className="text-sm font-semibold text-accent">
                  Ver todos
                </Link>
              </div>
              {friendsLoading ? (
                <CardListSkeleton count={1} />
              ) : friends.length === 0 ? (
                <Link
                  to="/amigos"
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98] dark:bg-surface-dark-subtle"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent dark:bg-accent-900/30 dark:text-accent-300">
                    <UserPlus size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="font-semibold">Añade a tus amigos</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Así podrás incluirlos en un grupo sin código</p>
                  </div>
                </Link>
              ) : (
                <Card>
                  <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                    {friends.slice(0, FRIENDS_PREVIEW_COUNT).map((f) => (
                      <li key={f.uid} className="flex items-center gap-3 py-2.5">
                        <Avatar name={f.name} color={f.color} size="sm" />
                        <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            {(pending.length > 0 || settled.length > 0) && (
              <section>
                <h2 className="mb-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">Activo</h2>
                <div className="flex flex-col gap-4">
                  {pending.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Pendientes de liquidar ({pending.length})
                      </h3>
                      <div className="flex flex-col gap-2.5">
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
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Saldados ({settled.length})</h3>
                      <div className="flex flex-col gap-2.5">
                        {settled.map((g) => (
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
                </div>
              </section>
            )}

            {archivedGroups.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Archivado ({archivedGroups.length})</h2>
                <div className="flex flex-col gap-2.5">
                  {archivedGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      groupId={g.id}
                      name={g.name}
                      icon={g.icon}
                      color={g.color}
                      balance={summaries[g.id]?.balance ?? 0}
                      currency={g.currency}
                      archived
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageContainer>

      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
      <JoinGroupSheet open={joining} onClose={() => setJoining(false)} />
    </>
  );
}
