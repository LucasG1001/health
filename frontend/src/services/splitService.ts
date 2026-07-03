import { api } from "./api";
import type { Split, SplitExerciseInput } from "../types/split";

export async function fetchSplits(): Promise<Split[]> {
  const response = await api.get<Split[]>("/api/splits");
  return response.data;
}

export async function fetchSplit(id: string): Promise<Split> {
  const response = await api.get<Split>(`/api/splits/${id}`);
  return response.data;
}

export async function createSplit(input: { name: string; weekdays: number[] }): Promise<Split> {
  const response = await api.post<Split>("/api/splits", input);
  return response.data;
}

export async function updateSplit(
  id: string,
  input: { name?: string; weekdays?: number[] }
): Promise<Split> {
  const response = await api.put<Split>(`/api/splits/${id}`, input);
  return response.data;
}

export async function replaceSplitExercises(id: string, exercises: SplitExerciseInput[]): Promise<Split> {
  const response = await api.put<Split>(`/api/splits/${id}/exercises`, { exercises });
  return response.data;
}

export async function reorderSplits(order: string[]): Promise<Split[]> {
  const response = await api.post<Split[]>("/api/splits/reorder", { order });
  return response.data;
}

export async function deleteSplit(id: string): Promise<void> {
  await api.delete(`/api/splits/${id}`);
}
