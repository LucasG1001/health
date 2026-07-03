import { api } from "./api";
import type { BodyStatPoint, Gamification, VolumePoint } from "../types/stats";

export async function fetchBodyStats(range?: { from?: string; to?: string }): Promise<BodyStatPoint[]> {
  const response = await api.get<BodyStatPoint[]>("/api/stats/body", { params: range });
  return response.data;
}

export async function fetchVolumeStats(groupBy: "week" | "month"): Promise<VolumePoint[]> {
  const response = await api.get<VolumePoint[]>("/api/stats/volume", { params: { groupBy } });
  return response.data;
}

export async function fetchGamification(): Promise<Gamification> {
  const response = await api.get<Gamification>("/api/stats/gamification");
  return response.data;
}
