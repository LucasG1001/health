import { api } from "./api";
import type {
  Exercise,
  ExerciseHistoryPoint,
  ExerciseInput,
  LastPerformance,
  MuscleGroup,
} from "../types/exercise";

export async function fetchExercises(muscleGroup?: MuscleGroup): Promise<Exercise[]> {
  const response = await api.get<Exercise[]>("/api/exercises", {
    params: muscleGroup ? { muscleGroup } : undefined,
  });
  return response.data;
}

export async function fetchExercise(id: string): Promise<Exercise> {
  const response = await api.get<Exercise>(`/api/exercises/${id}`);
  return response.data;
}

export async function createExercise(input: ExerciseInput & { name: string; muscleGroup: MuscleGroup }): Promise<Exercise> {
  const response = await api.post<Exercise>("/api/exercises", input);
  return response.data;
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<Exercise> {
  const response = await api.put<Exercise>(`/api/exercises/${id}`, input);
  return response.data;
}

export async function deleteExercise(id: string): Promise<void> {
  await api.delete(`/api/exercises/${id}`);
}

export async function uploadExerciseImage(id: string, file: File): Promise<Exercise> {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<Exercise>(`/api/exercises/${id}/image`, form, { timeout: 60000 });
  return response.data;
}

export async function removeExerciseImage(id: string): Promise<Exercise> {
  const response = await api.delete<Exercise>(`/api/exercises/${id}/image`);
  return response.data;
}

export async function fetchLastPerformance(id: string): Promise<LastPerformance | null> {
  const response = await api.get<LastPerformance | null>(`/api/exercises/${id}/last-performance`);
  return response.data;
}

export async function fetchExerciseHistory(
  id: string,
  range?: { from?: string; to?: string }
): Promise<ExerciseHistoryPoint[]> {
  const response = await api.get<ExerciseHistoryPoint[]>(`/api/exercises/${id}/history`, { params: range });
  return response.data;
}
