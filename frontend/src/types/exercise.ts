export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "other";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  imageUrl: string | null;
  hasUploadedImage: boolean;
  imageFocalX: number;
  imageFocalY: number;
  imageZoom: number;
  workingWeightKg: number | null;
  additionalWeightKg: number | null;
  machineSetting: string | null;
  notes: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseInput {
  name?: string;
  muscleGroup?: MuscleGroup;
  equipment?: string | null;
  imageUrl?: string | null;
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
  workingWeightKg?: number | null;
  additionalWeightKg?: number | null;
  machineSetting?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}
