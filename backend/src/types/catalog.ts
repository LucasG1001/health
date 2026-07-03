import type { MuscleGroup } from "./exercise.js";

export interface CatalogExerciseRow {
  id: string;
  external_id: string;
  name: string;
  muscle_group: MuscleGroup;
  primary_muscle: string | null;
  equipment: string | null;
  level: string | null;
  category: string | null;
  image_urls: string[];
  instructions: string | null;
  synced_at: Date;
  imported_exercise_id?: string | null;
}

export interface CatalogExercise {
  id: string;
  externalId: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscle: string | null;
  equipment: string | null;
  level: string | null;
  category: string | null;
  imageUrls: string[];
  instructions: string | null;
  importedExerciseId: string | null;
}
