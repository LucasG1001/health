import { useCallback, useEffect, useState } from "react";
import { fetchSessions } from "../services/sessionService";
import type { SessionSummaryItem } from "../types/session";

export function useSessionHistory(limit = 100) {
  const [sessions, setSessions] = useState<SessionSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSessions({ status: "completed", limit })
      .then((data) => {
        if (active) setSessions(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o histórico de treinos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, limit]);

  const reload = useCallback(() => {
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  return { sessions, loading, error, reload };
}
