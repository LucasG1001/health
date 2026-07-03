import { useCallback, useEffect, useState } from "react";
import { fetchGamification } from "../services/statsService";
import type { Gamification } from "../types/stats";

export function useGamification() {
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchGamification()
      .then((data) => {
        if (active) setGamification(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as conquistas.");
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

  return { gamification, loading, error, reload };
}
