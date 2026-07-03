export type PhotoPose = "front" | "side" | "back";

export interface PhotoRow {
  id: string;
  taken_on: string;
  pose: PhotoPose;
  file_path: string;
  notes: string | null;
  created_at: Date;
}

export interface ProgressPhoto {
  id: string;
  takenOn: string;
  pose: PhotoPose;
  url: string;
  notes: string | null;
  createdAt: Date;
}
