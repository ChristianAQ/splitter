import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeUserGroups } from "../services/groups.service";
import type { Group } from "../types";

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeUserGroups(user.uid, (data) => {
      setGroups(data.filter((g) => !g.archivedAt));
      setLoading(false);
    });
  }, [user]);

  return { groups, loading };
}
