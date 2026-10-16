import { z } from "zod";

const baseSplit = z.object({
  name: z.string().trim().min(1, "Informe o nome da divisão.").max(200),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .max(7, "Dias da semana inválidos.")
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
});

export const createSplitSchema = baseSplit;

export const updateSplitSchema = baseSplit.partial();

export const reorderSplitsSchema = z.object({
  order: z
    .array(z.uuid("ID inválido."))
    .min(1, "Forneça ao menos uma divisão.")
    .refine((ids) => new Set(ids).size === ids.length, { message: "Divisão repetida na ordem." }),
});

const REPS_RANGE = {
  check: (set: { targetRepsMin: number; targetRepsMax?: number | null }) =>
    set.targetRepsMax == null || set.targetRepsMax >= set.targetRepsMin,
  message: "O máximo de repetições não pode ser menor que o mínimo.",
};

const plannedSetSchema = z
  .object({
    targetRepsMin: z.number().int().min(1, "Repetições alvo inválidas.").max(200),
    targetRepsMax: z.number().int().min(1).max(200).nullish(),
  })
  .refine(REPS_RANGE.check, { message: REPS_RANGE.message });

export const replaceSplitExercisesSchema = z.object({
  exercises: z
    .array(
      z.object({
        exerciseId: z.uuid("Exercício inválido."),
        notes: z.string().max(2000).nullish(),
        plannedSets: z.array(plannedSetSchema).min(1, "Cada exercício precisa de ao menos uma série."),
      })
    )
    .max(30, "Limite de 30 exercícios por divisão.")
    // A tabela tem UNIQUE (split_id, exercise_id): repetido aqui virava 500.
    .refine(
      (exercises) => new Set(exercises.map((exercise) => exercise.exerciseId)).size === exercises.length,
      { message: "O mesmo exercício foi adicionado mais de uma vez." }
    ),
});

export const updateExercisePlanSchema = z
  .object({
    // Opcional: sem `series` só os alvos mudam, sem recriar as séries planejadas (nem os
    // ids), que é o caso de editar só as reps no card do exercício.
    series: z.number().int().min(1, "Informe ao menos uma série.").max(20, "Máximo de 20 séries.").optional(),
    targetRepsMin: z.number().int().min(1, "Repetições alvo inválidas.").max(200),
    targetRepsMax: z.number().int().min(1).max(200).nullish(),
  })
  .refine(REPS_RANGE.check, { message: REPS_RANGE.message });

export type CreateSplitBody = z.infer<typeof createSplitSchema>;
export type UpdateSplitBody = z.infer<typeof updateSplitSchema>;
export type ReplaceSplitExercisesBody = z.infer<typeof replaceSplitExercisesSchema>;
export type UpdateExercisePlanBody = z.infer<typeof updateExercisePlanSchema>;
