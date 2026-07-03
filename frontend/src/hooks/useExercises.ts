import { useCallback, useEffect, useState } from "react";
import { deleteExercise, fetchExercises } from "../services/exerciseService";
import type { Exercise } from "../types/exercise";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchExercises()
      .then((data) => {
        if (active) setExercises(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os exercícios.");
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

  const remove = useCallback(async (id: string) => {
    await deleteExercise(id);
    setExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  }, []);

  return { exercises, loading, error, reload, remove };
}
