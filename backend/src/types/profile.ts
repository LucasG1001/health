export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type BiologicalSex = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense" | "athlete";

export interface ProfileRow {
  id: string;
  height_cm: number | null;
  blood_type: string | null;
  birth_date: string | null;
  biological_sex: string | null;
  activity_level: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  injuries: string | null;
  created_at: Date;
  updated_at: Date;
}

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
  updatedAt: Date | null;
}

export interface ProfilePatch {
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
