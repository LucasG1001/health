import { useCallback } from "react";
import { fetchSessions } from "../services/sessionService";
import { useResource } from "./useResource";
import type { SessionSummaryItem } from "../types/session";

export function useSessionHistory(limit = 100) {
  const fetch = useCallback(() => fetchSessions({ status: "completed", limit }), [limit]);
  const { data: sessions, loading, error, reload } = useResource<SessionSummaryItem>(
    fetch,
    "Não foi possível carregar o histórico de treinos."
  );

  return { sessions, loading, error, reload };
}
