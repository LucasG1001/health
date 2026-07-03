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
  machineSetting: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseInput {
  name?: string;
  muscleGroup?: MuscleGroup;
  equipment?: string | null;
  imageUrl?: string | null;
  machineSetting?: string | null;
  notes?: string | null;
}

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
