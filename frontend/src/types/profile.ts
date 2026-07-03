export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type BiologicalSex = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense" | "athlete";

export interface Profile {
  heightCm: number | null;
  bloodType: BloodType | null;
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;
  activityLevel: ActivityLevel | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  injuries: string | null;
  age: number | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  latestWeightKg: number | null;
  updatedAt: string | null;
}

export interface ProfileInput {
  heightCm?: number | null;
  bloodType?: BloodType | null;
  birthDate?: string | null;
  biologicalSex?: BiologicalSex | null;
  activityLevel?: ActivityLevel | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  medications?: string | null;
  injuries?: string | null;
}
