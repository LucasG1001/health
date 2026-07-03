import { useCallback, useEffect, useState } from "react";
import { deleteGoal, fetchGoals, updateGoal } from "../services/goalService";
import type { Goal, GoalStatus } from "../types/goal";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchGoals()
      .then((data) => {
        if (active) setGoals(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as metas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const setStatus = useCallback(async (id: string, status: GoalStatus) => {
    const updated = await updateGoal(id, { status });
    setGoals((prev) => prev.map((goal) => (goal.id === id ? updated : goal)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }, []);

  const activeGoal = goals.find((goal) => goal.status === "active") ?? null;

  return { goals, activeGoal, loading, error, reload, setStatus, remove };
}
