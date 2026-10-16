import { z } from "zod";
import { isoDate } from "./common.js";

const goalTargets = {
  targetWeightKg: z.number().positive("Peso alvo inválido.").max(500).nullish(),
  targetBodyFatPct: z.number().min(1, "% de gordura alvo inválido.").max(75).nullish(),
  targetDate: isoDate("Data alvo inválida (use YYYY-MM-DD).").nullish(),
};

const hasTarget = {
  check: (goal: { targetWeightKg?: number | null; targetBodyFatPct?: number | null }) =>
    goal.targetWeightKg != null || goal.targetBodyFatPct != null,
  message: "Defina um peso alvo e/ou um % de gordura alvo.",
};

export const createGoalSchema = z
  .object(goalTargets)
  .refine(hasTarget.check, { message: hasTarget.message });

// Só o corpo que zera os dois alvos é recusável aqui: um campo ausente mantém o valor do
// banco. O caso "zera um, o outro já era nulo" fica com o CHECK da tabela (pgError).
export const updateGoalSchema = z
  .object({
    ...goalTargets,
    status: z.enum(["active", "achieved", "abandoned"]).optional(),
  })
  .refine((goal) => !(goal.targetWeightKg === null && goal.targetBodyFatPct === null), {
    message: hasTarget.message,
  });

export type CreateGoalBody = z.infer<typeof createGoalSchema>;
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>;
