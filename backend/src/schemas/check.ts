import { z } from "zod";

export const setExerciseCheckSchema = z.object({
  checked: z.boolean({ message: "Informe se o exercício foi feito." }),
});

export type SetExerciseCheckBody = z.infer<typeof setExerciseCheckSchema>;
