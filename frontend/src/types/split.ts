import type { MuscleGroup } from "./exercise";

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
  /** Marcado como feito hoje (reseta na virada do dia). */
  checkedToday: boolean;
  workingWeightKg: number | null;
  additionalWeightKg: number | null;
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
  plannedSets: PlannedSetInput[];
}

export interface UpdateExercisePlanInput {
  /** Ausente = mantém a quantidade de séries e só atualiza os alvos. */
  series?: number;
  targetRepsMin: number;
  targetRepsMax?: number | null;
}
