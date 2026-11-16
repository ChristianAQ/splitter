import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeUserGroups } from "../services/groups.service";
import type { Group } from "../types";

/**
 * `groups` is what the user considers active. `archivedGroups` is everything
 * put away, for either reason: closed for everyone by its admin
 * (`group.archivedAt`), or archived just for this user (their profile's
 * `archivedGroupIds` — see setGroupArchivedForMe). `archivedForMeIds` tells
 * the two apart for the screens that need to.
 */
export function useGroups() {
  const { user, profile } = useAuth();
  const [all, setAll] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAll([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeUserGroups(
      user.uid,
      (data) => {
        setAll(data);
        setLoading(false);
      },
      // Without this a failed query (offline with a cold cache, a missing
      // index...) left every screen using this hook on its skeleton forever.
      () => setLoading(false)
    );
  }, [user]);

  const archivedKey = (profile?.archivedGroupIds ?? []).join(",");

  return useMemo(() => {
    const archivedForMeIds = new Set(archivedKey ? archivedKey.split(",") : []);
    const isArchived = (g: Group) => Boolean(g.archivedAt) || archivedForMeIds.has(g.id);
    return {
      groups: all.filter((g) => !isArchived(g)),
      archivedGroups: all.filter(isArchived),
      archivedForMeIds,
      loading,
    };
  }, [all, archivedKey, loading]);
}
