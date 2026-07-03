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

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  image_path: string | null;
  image_url: string | null;
  machine_setting: string | null;
  notes: string | null;
  external_id: string | null;
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
  machineSetting: string | null;
  notes: string | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewExercise {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string | null;
  imageUrl?: string | null;
  machineSetting?: string | null;
  notes?: string | null;
  externalId?: string | null;
  imagePath?: string | null;
}

export type ExercisePatch = Partial<Omit<NewExercise, "externalId" | "imagePath">>;

export interface LastPerformanceSet {
  setType: string;
  weightKg: number | null;
  reps: number | null;
}

export interface LastPerformance {
  sessionId: string;
  date: string;
  sets: LastPerformanceSet[];
}

export interface ExerciseHistoryPoint {
  sessionId: string;
  date: string;
  maxWeightKg: number | null;
  totalVolumeKg: number | null;
  workingSets: number;
  estOneRepMax: number | null;
}
