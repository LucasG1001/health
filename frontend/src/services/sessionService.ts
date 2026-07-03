import { api } from "./api";
import type {
  FinishResponse,
  SessionSet,
  SessionSetPatch,
  SessionExercise,
  SessionSummaryItem,
  WorkoutSession,
} from "../types/session";
import type { SetType, SetVariation } from "../types/split";

export async function fetchSessions(filters?: {
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
}): Promise<SessionSummaryItem[]> {
  const response = await api.get<SessionSummaryItem[]>("/api/sessions", { params: filters });
  return response.data;
}

export async function fetchActiveSession(): Promise<WorkoutSession | null> {
  const response = await api.get<WorkoutSession | null>("/api/sessions/active");
  return response.data;
}

export async function fetchSession(id: string): Promise<WorkoutSession> {
  const response = await api.get<WorkoutSession>(`/api/sessions/${id}`);
  return response.data;
}

export async function startSession(splitId: string): Promise<WorkoutSession> {
  const response = await api.post<WorkoutSession>("/api/sessions", { splitId });
  return response.data;
}

export async function updateSessionNotes(id: string, notes: string | null): Promise<WorkoutSession> {
  const response = await api.patch<WorkoutSession>(`/api/sessions/${id}`, { notes });
  return response.data;
}

export async function finishSession(id: string): Promise<FinishResponse> {
  const response = await api.post<FinishResponse>(`/api/sessions/${id}/finish`);
  return response.data;
}

export async function discardSession(id: string): Promise<void> {
  await api.delete(`/api/sessions/${id}`);
}

export async function addSessionExercise(sessionId: string, exerciseId: string): Promise<SessionExercise> {
  const response = await api.post<SessionExercise>(`/api/sessions/${sessionId}/exercises`, { exerciseId });
  return response.data;
}

export async function removeSessionExercise(sessionExerciseId: string): Promise<void> {
  await api.delete(`/api/session-exercises/${sessionExerciseId}`);
}

export async function addSessionSet(
  sessionExerciseId: string,
  input: { setType?: SetType; variation?: SetVariation; weightKg?: number | null; reps?: number | null }
): Promise<SessionSet> {
  const response = await api.post<SessionSet>(`/api/session-exercises/${sessionExerciseId}/sets`, input);
  return response.data;
}

export async function updateSessionSet(id: string, patch: SessionSetPatch): Promise<SessionSet> {
  const response = await api.put<SessionSet>(`/api/session-sets/${id}`, patch);
  return response.data;
}

export async function deleteSessionSet(id: string): Promise<void> {
  await api.delete(`/api/session-sets/${id}`);
}
