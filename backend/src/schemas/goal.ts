import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const goalTargets = {
  targetWeightKg: z.number().positive("Peso alvo inválido.").max(500).nullish(),
  targetBodyFatPct: z.number().min(1, "% de gordura alvo inválido.").max(75).nullish(),
  targetDate: z.string().regex(DATE_RE, "Data alvo inválida (use YYYY-MM-DD).").nullish(),
};

export const createGoalSchema = z
  .object(goalTargets)
  .refine((goal) => goal.targetWeightKg != null || goal.targetBodyFatPct != null, {
    message: "Defina um peso alvo e/ou um % de gordura alvo.",
  });

export const updateGoalSchema = z.object({
  ...goalTargets,
  status: z.enum(["active", "achieved", "abandoned"]).optional(),
});

export type CreateGoalBody = z.infer<typeof createGoalSchema>;
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>;
