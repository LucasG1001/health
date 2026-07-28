import { useCallback } from "react";
import { deleteGoal, fetchGoals, updateGoal } from "../services/goalService";
import { apiErrorMessage } from "../utils/apiError";
import { useResource } from "./useResource";
import type { Goal, GoalStatus } from "../types/goal";

export function useGoals() {
  const { data: goals, setData, loading, error, setError, reload, remove } = useResource<Goal>(
    fetchGoals,
    "Não foi possível carregar as metas.",
    deleteGoal,
    "Não foi possível excluir a meta."
  );

  const setStatus = useCallback(
    async (id: string, status: GoalStatus): Promise<boolean> => {
      setError(null);
      try {
        const updated = await updateGoal(id, { status });
        setData((prev) => prev.map((goal) => (goal.id === id ? updated : goal)));
        return true;
      } catch (err) {
        setError(apiErrorMessage(err, "Não foi possível atualizar a meta."));
        return false;
      }
    },
    [setData, setError]
  );

  const activeGoal = goals.find((goal) => goal.status === "active") ?? null;

  return { goals, activeGoal, loading, error, reload, setStatus, remove };
}
