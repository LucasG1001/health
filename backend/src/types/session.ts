import type { MuscleGroup } from "./exercise.js";
import type { SetType, SetVariation } from "./split.js";

export type SessionStatus = "in_progress" | "completed";

export interface SessionRow {
  id: string;
  split_id: string | null;
  split_name: string;
  status: SessionStatus;
  started_at: Date;
  finished_at: Date | null;
  duration_seconds: number | null;
  total_volume_kg: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  position: number;
  notes: string | null;
  muscle_group: MuscleGroup | null;
  equipment: string | null;
  image_path: string | null;
  image_url: string | null;
  machine_setting: string | null;
}

export interface SessionSetRow {
  id: string;
  session_exercise_id: string;
  position: number;
  set_type: SetType;
  variation: SetVariation;
  target_reps_min: number | null;
  target_reps_max: number | null;
  rest_seconds: number | null;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  completed_at: Date | null;
}

export interface SessionSet {
  id: string;
  position: number;
  setType: SetType;
  variation: SetVariation;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number | null;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  completedAt: Date | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  muscleGroup: MuscleGroup | null;
  equipment: string | null;
  imageUrl: string | null;
  machineSetting: string | null;
  position: number;
  notes: string | null;
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  splitId: string | null;
  splitName: string;
  status: SessionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  notes: string | null;
  exercises: SessionExercise[];
}

export interface SessionSummaryItem {
  id: string;
  splitId: string | null;
  splitName: string;
  status: SessionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  notes: string | null;
  exerciseCount: number;
  completedSets: number;
}

export interface SessionSetPatch {
  setType?: SetType;
  variation?: SetVariation;
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
  completed?: boolean;
}

export interface PrSummary {
  exerciseId: string;
  exerciseName: string;
  recordType: "max_weight" | "max_set_volume";
  value: number;
  previousValue: number | null;
}

export interface BadgeSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface FinishSummary {
  durationSeconds: number;
  totalVolumeKg: number;
  completedSets: number;
  plannedSets: number;
  prs: PrSummary[];
  newBadges: BadgeSummary[];
  currentStreak: number;
}
