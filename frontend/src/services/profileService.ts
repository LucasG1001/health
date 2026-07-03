import { api } from "./api";
import type { Profile, ProfileInput } from "../types/profile";

export async function fetchProfile(): Promise<Profile> {
  const response = await api.get<Profile>("/api/profile");
  return response.data;
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const response = await api.put<Profile>("/api/profile", input);
  return response.data;
}
