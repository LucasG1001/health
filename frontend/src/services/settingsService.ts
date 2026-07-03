import { api } from "./api";
import type { Settings, SettingsInput } from "../types/settings";

export async function fetchSettings(): Promise<Settings> {
  const response = await api.get<Settings>("/api/settings");
  return response.data;
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const response = await api.put<Settings>("/api/settings", input);
  return response.data;
}
