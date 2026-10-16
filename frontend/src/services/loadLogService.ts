import { api } from "./api";
import type { LoadLogEntry } from "../types/loadLog";

export const LOAD_LOG_PAGE_SIZE = 100;

export async function fetchLoadLog(before?: string): Promise<LoadLogEntry[]> {
  const response = await api.get<LoadLogEntry[]>("/api/load-log", {
    params: { limit: LOAD_LOG_PAGE_SIZE, ...(before ? { before } : {}) },
  });
  return response.data;
}
