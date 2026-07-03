import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const profileUpdateSchema = z.object({
  heightCm: z.number().positive("Altura inválida.").max(272, "Altura inválida.").nullish(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).nullish(),
  birthDate: z.string().regex(DATE_RE, "Data de nascimento inválida (use YYYY-MM-DD).").nullish(),
  biologicalSex: z.enum(["male", "female"]).nullish(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense", "athlete"]).nullish(),
  allergies: z.string().max(4000).nullish(),
  medicalConditions: z.string().max(4000).nullish(),
  medications: z.string().max(4000).nullish(),
  injuries: z.string().max(4000).nullish(),
});

export type ProfileUpdateBody = z.infer<typeof profileUpdateSchema>;
