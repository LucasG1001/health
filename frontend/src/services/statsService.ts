import { api } from "./api";
import type { BodyStatPoint, VolumePoint } from "../types/stats";

export async function fetchBodyStats(range?: { from?: string; to?: string }): Promise<BodyStatPoint[]> {
  const response = await api.get<BodyStatPoint[]>("/api/stats/body", { params: range });
  return response.data;
}

export async function fetchVolumeStats(groupBy: "week" | "month"): Promise<VolumePoint[]> {
  const response = await api.get<VolumePoint[]>("/api/stats/volume", { params: { groupBy } });
  return response.data;
}
