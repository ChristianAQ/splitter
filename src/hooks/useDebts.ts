import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeDebts } from "../services/debts.service";
import type { Debt } from "../types";

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDebts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    return subscribeDebts(
      user.uid,
      (items) => {
        setDebts(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [user]);

  return { debts, loading, error };
}
