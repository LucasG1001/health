import type { MuscleGroup } from "./exercise";

export type SetType = "warmup" | "working";

export type SetVariation = "normal" | "drop_set" | "bi_set" | "superset" | "rest_pause";

export interface PlannedSet {
  id: string;
  position: number;
  setType: SetType;
  variation: SetVariation;
  targetRepsMin: number;
  targetRepsMax: number | null;
  suggestedWeightKg: number | null;
  restSeconds: number | null;
}

export interface SplitExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  imageUrl: string | null;
  machineSetting: string | null;
  position: number;
  restSeconds: number | null;
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
  setType: SetType;
  variation: SetVariation;
  targetRepsMin: number;
  targetRepsMax?: number | null;
  suggestedWeightKg?: number | null;
  restSeconds?: number | null;
}

export interface SplitExerciseInput {
  exerciseId: string;
  restSeconds?: number | null;
  notes?: string | null;
  plannedSets: PlannedSetInput[];
}
