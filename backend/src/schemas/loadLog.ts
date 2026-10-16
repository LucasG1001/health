import { z } from "zod";

export const loadLogQuerySchema = z.object({
  limit: z.coerce
    .number("Limite inválido.")
    .int("Limite inválido.")
    .min(1, "Limite inválido.")
    .max(200, "Limite máximo é 200.")
    .default(100),
  before: z.iso.datetime({ offset: true, message: "Cursor inválido." }).optional(),
});

export type LoadLogQuery = z.infer<typeof loadLogQuerySchema>;
