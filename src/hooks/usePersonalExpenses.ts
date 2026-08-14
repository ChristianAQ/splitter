import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribePersonalExpenses } from "../services/personalExpenses.service";
import type { PersonalExpense } from "../types";

export function usePersonalExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribePersonalExpenses(
      user.uid,
      (items) => {
        setExpenses(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [user]);

  return { expenses, loading, error };
}
