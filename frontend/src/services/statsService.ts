import { api } from "./api";
import type { VolumePoint } from "../types/stats";

export async function fetchVolumeStats(groupBy: "week" | "month"): Promise<VolumePoint[]> {
  const response = await api.get<VolumePoint[]>("/api/stats/volume", { params: { groupBy } });
  return response.data;
}
