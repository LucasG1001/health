import { z } from "zod";
import { httpUrl } from "./common.js";
import { MUSCLE_GROUPS } from "../types/exercise.js";

const baseExercise = {
  equipment: z.string().max(200).nullish(),
  imageUrl: httpUrl("URL de imagem inválida.").nullish(),
  imageFocalX: z.number().min(0).max(100).optional(),
  imageFocalY: z.number().min(0).max(100).optional(),
  imageZoom: z.number().min(1).max(4).optional(),
  workingWeightKg: z.number().min(0).max(2000).nullish(),
  machineSetting: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  videoUrl: httpUrl("Link de vídeo inválido.").nullish(),
};

// O trim importa: o índice único é sobre LOWER(name), então " Supino" driblava a checagem.
const exerciseName = z.string().trim().min(1, "Informe o nome do exercício.").max(200);

export const createExerciseSchema = z.object({
  name: exerciseName,
  muscleGroup: z.enum(MUSCLE_GROUPS, "Grupo muscular inválido."),
  ...baseExercise,
});

export const updateExerciseSchema = z.object({
  name: exerciseName.optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS, "Grupo muscular inválido.").optional(),
  ...baseExercise,
});

export type CreateExerciseBody = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseBody = z.infer<typeof updateExerciseSchema>;
