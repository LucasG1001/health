import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const measurementFields = {
  weightKg: z.number().positive("Peso inválido.").max(500, "Peso inválido.").nullish(),
  bodyFatPct: z.number().min(1, "% de gordura inválido.").max(75, "% de gordura inválido.").nullish(),
  waistCm: z.number().positive("Medida inválida.").max(300).nullish(),
  hipCm: z.number().positive("Medida inválida.").max(300).nullish(),
  armCm: z.number().positive("Medida inválida.").max(150).nullish(),
  thighCm: z.number().positive("Medida inválida.").max(200).nullish(),
  chestCm: z.number().positive("Medida inválida.").max(300).nullish(),
  notes: z.string().max(2000).nullish(),
};

export const createMeasurementSchema = z.object({
  measuredOn: z.string().regex(DATE_RE, "Data inválida (use YYYY-MM-DD)."),
  ...measurementFields,
});

export const updateMeasurementSchema = z.object({
  measuredOn: z.string().regex(DATE_RE, "Data inválida (use YYYY-MM-DD).").optional(),
  ...measurementFields,
});

export type CreateMeasurementBody = z.infer<typeof createMeasurementSchema>;
export type UpdateMeasurementBody = z.infer<typeof updateMeasurementSchema>;
