import type { MuscleGroup } from "./exercise.js";

export type SetType = "warmup" | "working";

export type SetVariation = "normal" | "drop_set" | "bi_set" | "superset" | "rest_pause";

export interface SplitRow {
  id: string;
  name: string;
  weekdays: number[];
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface SplitExerciseRow {
  id: string;
  split_id: string;
  exercise_id: string;
  position: number;
  rest_seconds: number | null;
  notes: string | null;
  exercise_name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  image_path: string | null;
  image_url: string | null;
  machine_setting: string | null;
}

export interface PlannedSetRow {
  id: string;
  split_exercise_id: string;
  position: number;
  set_type: SetType;
  variation: SetVariation;
  target_reps_min: number;
  target_reps_max: number | null;
  suggested_weight_kg: number | null;
  rest_seconds: number | null;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SplitExerciseInput {
  exerciseId: string;
  restSeconds?: number | null;
  notes?: string | null;
  plannedSets: {
    setType: SetType;
    variation: SetVariation;
    targetRepsMin: number;
    targetRepsMax?: number | null;
    suggestedWeightKg?: number | null;
    restSeconds?: number | null;
  }[];
}
