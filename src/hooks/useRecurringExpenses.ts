import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeRecurringExpenses } from "../services/recurringExpenses.service";
import type { RecurringExpense } from "../types";

export function useRecurringExpenses() {
  const { user } = useAuth();
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeRecurringExpenses(user.uid, (data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  return { items, loading };
}
