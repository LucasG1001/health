import type { MuscleGroup } from "./exercise.js";

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
  working_weight_kg: number | null;
  additional_weight_kg: number | null;
  notes: string | null;
  exercise_name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  image_path: string | null;
  image_url: string | null;
  image_focal_x: number;
  image_focal_y: number;
  image_zoom: number;
  machine_setting: string | null;
  video_url: string | null;
  exercise_notes: string | null;
  checked_today: boolean;
}

export interface PlannedSetRow {
  id: string;
  split_exercise_id: string;
  position: number;
  target_reps_min: number;
  target_reps_max: number | null;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SplitExerciseInput {
  exerciseId: string;
  notes?: string | null;
  plannedSets: {
    targetRepsMin: number;
    targetRepsMax?: number | null;
  }[];
}

export interface UpdateExercisePlanInput {
  /** Ausente = mantém a quantidade de séries e só atualiza os alvos. */
  series?: number;
  targetRepsMin: number;
  targetRepsMax?: number | null;
}
