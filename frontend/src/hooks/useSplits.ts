import { useCallback, useEffect, useState } from "react";
import { deleteSplit, fetchSplits } from "../services/splitService";
import type { Split } from "../types/split";

export function useSplits() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSplits()
      .then((data) => {
        if (active) setSplits(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as divisões.");
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
    await deleteSplit(id);
    setSplits((prev) => prev.filter((split) => split.id !== id));
  }, []);

  return { splits, loading, error, reload, remove };
}
