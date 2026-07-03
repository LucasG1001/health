import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createPhotoSchema = z.object({
  takenOn: z.string().regex(DATE_RE, "Data inválida (use YYYY-MM-DD)."),
  pose: z.enum(["front", "side", "back"], "Pose inválida (use front, side ou back)."),
  notes: z.string().max(2000).nullish(),
});

export type CreatePhotoBody = z.infer<typeof createPhotoSchema>;
