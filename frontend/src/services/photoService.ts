import { api } from "./api";
import type { PhotoPose, ProgressPhoto } from "../types/photo";

export async function fetchPhotos(filters?: {
  pose?: PhotoPose;
  from?: string;
  to?: string;
}): Promise<ProgressPhoto[]> {
  const response = await api.get<ProgressPhoto[]>("/api/photos", { params: filters });
  return response.data;
}

export async function uploadPhoto(input: {
  file: File;
  takenOn: string;
  pose: PhotoPose;
  notes?: string;
}): Promise<ProgressPhoto> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("takenOn", input.takenOn);
  form.append("pose", input.pose);
  if (input.notes) form.append("notes", input.notes);
  const response = await api.post<ProgressPhoto>("/api/photos", form, { timeout: 60000 });
  return response.data;
}

export async function deletePhoto(id: string): Promise<void> {
  await api.delete(`/api/photos/${id}`);
}
