import { api } from "./api";
import type { CatalogExercise } from "../types/catalog";
import type { Exercise, MuscleGroup } from "../types/exercise";

export async function searchCatalog(filters: {
  q?: string;
  muscleGroup?: MuscleGroup;
  limit?: number;
}): Promise<CatalogExercise[]> {
  const response = await api.get<CatalogExercise[]>("/api/catalog/exercises", {
    params: filters,
    timeout: 60000,
  });
  return response.data;
}

export async function importExercise(catalogId: string): Promise<Exercise> {
  const response = await api.post<Exercise>("/api/exercises/import", { catalogId }, { timeout: 60000 });
  return response.data;
}
