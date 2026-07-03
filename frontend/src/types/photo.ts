export type PhotoPose = "front" | "side" | "back";

export interface ProgressPhoto {
  id: string;
  takenOn: string;
  pose: PhotoPose;
  url: string;
  notes: string | null;
  createdAt: string;
}
