import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeFriends } from "../services/friends.service";
import type { Friend } from "../types";

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeFriends(user.uid, (data) => {
      setFriends(data);
      setLoading(false);
    });
  }, [user]);

  return { friends, loading };
}
