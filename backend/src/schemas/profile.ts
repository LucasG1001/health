import { z } from "zod";
import { pastIsoDate } from "./common.js";

export const profileUpdateSchema = z.object({
  heightCm: z.number().positive("Altura inválida.").max(272, "Altura inválida.").nullish(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).nullish(),
  // Data futura produzia idade negativa e, com ela, TMB/TDEE negativos.
  birthDate: pastIsoDate("Data de nascimento inválida (use YYYY-MM-DD).").nullish(),
  biologicalSex: z.enum(["male", "female"]).nullish(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense", "athlete"]).nullish(),
  allergies: z.string().max(4000).nullish(),
  medicalConditions: z.string().max(4000).nullish(),
  medications: z.string().max(4000).nullish(),
  injuries: z.string().max(4000).nullish(),
});

export type ProfileUpdateBody = z.infer<typeof profileUpdateSchema>;
