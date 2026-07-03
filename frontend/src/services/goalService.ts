import { api } from "./api";
import type { Goal, GoalInput, GoalStatus } from "../types/goal";

export async function fetchGoals(): Promise<Goal[]> {
  const response = await api.get<Goal[]>("/api/goals");
  return response.data;
}

export async function fetchActiveGoal(): Promise<Goal | null> {
  const response = await api.get<Goal | null>("/api/goals/active");
  return response.data;
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const response = await api.post<Goal>("/api/goals", input);
  return response.data;
}

export async function updateGoal(id: string, input: GoalInput & { status?: GoalStatus }): Promise<Goal> {
  const response = await api.put<Goal>(`/api/goals/${id}`, input);
  return response.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/api/goals/${id}`);
}
