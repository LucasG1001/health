import type { MuscleGroup } from "./exercise";

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
