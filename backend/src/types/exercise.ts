export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  image_path: string | null;
  image_url: string | null;
  image_focal_x: number;
  image_focal_y: number;
  image_zoom: number;
  working_weight_kg: number | null;
  additional_weight_kg: number | null;
  machine_setting: string | null;
  notes: string | null;
  video_url: string | null;
  created_at: Date;
  updated_at: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface NewExercise {
  name: string;
  muscleGroup: MuscleGroup;
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

export type ExercisePatch = Partial<NewExercise>;
