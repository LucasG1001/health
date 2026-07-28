import { deleteExercise, fetchExercises } from "../services/exerciseService";
import { useResource } from "./useResource";
import type { Exercise } from "../types/exercise";

export function useExercises() {
  const { data: exercises, loading, error, reload, remove } = useResource<Exercise>(
    fetchExercises,
    "Não foi possível carregar os exercícios.",
    deleteExercise,
    "Não foi possível excluir o exercício."
  );

  return { exercises, loading, error, reload, remove };
}
