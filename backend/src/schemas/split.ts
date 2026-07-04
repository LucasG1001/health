import { z } from "zod";

const baseSplit = z.object({
  name: z.string().min(1, "Informe o nome da divisão.").max(200),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7, "Dias da semana inválidos."),
});

export const createSplitSchema = baseSplit;

export const updateSplitSchema = baseSplit.partial();

export const reorderSplitsSchema = z.object({
  order: z.array(z.uuid("ID inválido.")).min(1, "Forneça ao menos uma divisão."),
});

const plannedSetSchema = z.object({
  targetRepsMin: z.number().int().min(1, "Repetições alvo inválidas.").max(200),
  targetRepsMax: z.number().int().min(1).max(200).nullish(),
});

export const replaceSplitExercisesSchema = z.object({
  exercises: z
    .array(
      z.object({
        exerciseId: z.uuid("Exercício inválido."),
        notes: z.string().max(2000).nullish(),
        plannedSets: z.array(plannedSetSchema).min(1, "Cada exercício precisa de ao menos uma série."),
      })
    )
    .max(30, "Limite de 30 exercícios por divisão."),
});

export type CreateSplitBody = z.infer<typeof createSplitSchema>;
export type UpdateSplitBody = z.infer<typeof updateSplitSchema>;
export type ReplaceSplitExercisesBody = z.infer<typeof replaceSplitExercisesSchema>;
