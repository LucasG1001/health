import { z } from "zod";

export const settingsUpdateSchema = z.object({
  weighInFrequency: z.enum(["daily", "weekly", "biweekly", "monthly", "off"]).optional(),
  waterGoalMl: z.number().int().positive("Meta de água inválida.").max(20000).nullish(),
  calorieGoalKcal: z.number().int().positive("Meta de calorias inválida.").max(20000).nullish(),
});

export type SettingsUpdateBody = z.infer<typeof settingsUpdateSchema>;
