import { deleteSplit, fetchSplits } from "../services/splitService";
import { useResource } from "./useResource";
import type { Split } from "../types/split";

export function useSplits() {
  const { data: splits, loading, error, reload, remove } = useResource<Split>(
    fetchSplits,
    "Não foi possível carregar as divisões.",
    deleteSplit,
    "Não foi possível excluir a divisão."
  );

  return { splits, loading, error, reload, remove };
}
