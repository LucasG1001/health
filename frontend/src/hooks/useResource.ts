import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "../utils/apiError";

/**
 * Carga de uma coleção da API com loading, erro e recarga. `fetch`, `loadError`,
 * `deleteItem` e `deleteError` precisam ser referências estáveis (função de módulo
 * ou useCallback / string literal) — são dependências do efeito de carga.
 */
export function useResource<T extends { id: string }>(
  fetch: () => Promise<T[]>,
  loadError: string,
  deleteItem?: (id: string) => Promise<void>,
  deleteError?: string
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch()
      .then((items) => {
        if (active) setData(items);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetch, loadError, refreshKey]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!deleteItem) return false;
      setError(null);
      try {
        await deleteItem(id);
        setData((prev) => prev.filter((item) => item.id !== id));
        return true;
      } catch (err) {
        setError(apiErrorMessage(err, deleteError ?? "Não foi possível excluir."));
        return false;
      }
    },
    [deleteItem, deleteError]
  );

  return { data, setData, loading, error, setError, reload, remove };
}
