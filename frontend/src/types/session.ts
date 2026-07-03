import type { MuscleGroup } from "./exercise";
import type { SetType, SetVariation } from "./split";

export type SessionStatus = "in_progress" | "completed";

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
  completedAt: string | null;
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
  startedAt: string;
  finishedAt: string | null;
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
  startedAt: string;
  finishedAt: string | null;
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

export interface FinishResponse {
  session: WorkoutSession;
  summary: FinishSummary;
}
