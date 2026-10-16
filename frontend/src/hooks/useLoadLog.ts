import { useCallback, useEffect, useState } from "react";
import { LOAD_LOG_PAGE_SIZE, fetchLoadLog } from "../services/loadLogService";
import { apiErrorMessage } from "../utils/apiError";
import type { LoadLogEntry } from "../types/loadLog";

const LOAD_ERROR = "Não foi possível carregar o log do treino.";

/**
 * Log paginado por cursor (`before` = instante da última linha carregada). A API nunca
 * corta um save entre páginas, então a página pode vir maior que o tamanho pedido.
 */
export function useLoadLog() {
  const [entries, setEntries] = useState<LoadLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchLoadLog()
      .then((page) => {
        if (!active) return;
        setEntries(page);
        setHasMore(page.length >= LOAD_LOG_PAGE_SIZE);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, LOAD_ERROR));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const loadMore = useCallback(async () => {
    const last = entries[entries.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchLoadLog(last.changedAt);
      setEntries((prev) => [...prev, ...page]);
      setHasMore(page.length >= LOAD_LOG_PAGE_SIZE);
    } catch (err) {
      setError(apiErrorMessage(err, LOAD_ERROR));
    } finally {
      setLoadingMore(false);
    }
  }, [entries, loadingMore]);

  return { entries, loading, loadingMore, hasMore, error, reload, loadMore };
}
