import { z } from "zod";
import { isoDate } from "./common.js";
import { PHOTO_POSES } from "../types/photo.js";

export const createPhotoSchema = z.object({
  takenOn: isoDate("Data inválida (use YYYY-MM-DD)."),
  pose: z.enum(PHOTO_POSES, "Pose inválida (use front, side ou back)."),
  notes: z.string().max(2000).nullish(),
});

export type CreatePhotoBody = z.infer<typeof createPhotoSchema>;
