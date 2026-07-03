import { z } from "zod";

export const settingsUpdateSchema = z.object({
  weighInFrequency: z.enum(["daily", "weekly", "biweekly", "monthly", "off"]).optional(),
  waterGoalMl: z.number().int().positive("Meta de água inválida.").max(20000).nullish(),
  calorieGoalKcal: z.number().int().positive("Meta de calorias inválida.").max(20000).nullish(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  wakeLockEnabled: z.boolean().optional(),
  restWarmupSeconds: z.number().int().min(5, "Descanso mínimo de 5s.").max(600, "Descanso máximo de 600s.").optional(),
  restWorkingSeconds: z.number().int().min(5, "Descanso mínimo de 5s.").max(600, "Descanso máximo de 600s.").optional(),
});

export type SettingsUpdateBody = z.infer<typeof settingsUpdateSchema>;
