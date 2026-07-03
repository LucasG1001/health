import { z } from "zod";

const SET_TYPES = ["warmup", "working"] as const;
const VARIATIONS = ["normal", "drop_set", "bi_set", "superset", "rest_pause"] as const;

export const startSessionSchema = z.object({
  splitId: z.uuid("Divisão inválida."),
});

export const updateSessionSchema = z.object({
  notes: z.string().max(4000).nullish(),
});

export const addSessionExerciseSchema = z.object({
  exerciseId: z.uuid("Exercício inválido."),
});

export const addSessionSetSchema = z.object({
  setType: z.enum(SET_TYPES, "Tipo de série inválido.").optional(),
  variation: z.enum(VARIATIONS, "Variação inválida.").optional(),
  weightKg: z.number().min(0).max(2000).nullish(),
  reps: z.number().int().min(0).max(500).nullish(),
});

export const updateSessionSetSchema = z.object({
  setType: z.enum(SET_TYPES, "Tipo de série inválido.").optional(),
  variation: z.enum(VARIATIONS, "Variação inválida.").optional(),
  weightKg: z.number().min(0).max(2000).nullish(),
  reps: z.number().int().min(0).max(500).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  rir: z.number().int().min(0).max(10).nullish(),
  completed: z.boolean().optional(),
});

export type StartSessionBody = z.infer<typeof startSessionSchema>;
export type UpdateSessionBody = z.infer<typeof updateSessionSchema>;
export type AddSessionExerciseBody = z.infer<typeof addSessionExerciseSchema>;
export type AddSessionSetBody = z.infer<typeof addSessionSetSchema>;
export type UpdateSessionSetBody = z.infer<typeof updateSessionSetSchema>;
