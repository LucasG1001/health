import { z } from "zod";

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "other",
] as const;

const baseExercise = {
  equipment: z.string().max(200).nullish(),
  imageUrl: z.url("URL de imagem inválida.").max(1000).nullish(),
  machineSetting: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
};

export const createExerciseSchema = z.object({
  name: z.string().min(1, "Informe o nome do exercício.").max(200),
  muscleGroup: z.enum(MUSCLE_GROUPS, "Grupo muscular inválido."),
  ...baseExercise,
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1, "Informe o nome do exercício.").max(200).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS, "Grupo muscular inválido.").optional(),
  ...baseExercise,
});

export type CreateExerciseBody = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseBody = z.infer<typeof updateExerciseSchema>;
