import type { MuscleGroup } from "./exercise";

export type SetType = "warmup" | "working";

export type SetVariation = "normal" | "drop_set" | "bi_set" | "superset" | "rest_pause";

export interface PlannedSet {
  id: string;
  position: number;
  targetRepsMin: number;
  targetRepsMax: number | null;
}

export interface SplitExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  imageUrl: string | null;
  imageFocalX: number;
  imageFocalY: number;
  imageZoom: number;
  machineSetting: string | null;
  position: number;
  restSeconds: number | null;
  workingWeightKg: number | null;
  videoUrl: string | null;
  instructions: string | null;
  notes: string | null;
  plannedSets: PlannedSet[];
}

export interface Split {
  id: string;
  name: string;
  weekdays: number[];
  position: number;
  exercises: SplitExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface PlannedSetInput {
  targetRepsMin: number;
  targetRepsMax?: number | null;
}

export interface SplitExerciseInput {
  exerciseId: string;
  notes?: string | null;
  workingWeightKg?: number | null;
  restSeconds?: number | null;
  plannedSets: PlannedSetInput[];
}

export interface UpdateExercisePlanInput {
  series: number;
  targetRepsMin: number;
  targetRepsMax?: number | null;
  workingWeightKg?: number | null;
  restSeconds?: number | null;
}
