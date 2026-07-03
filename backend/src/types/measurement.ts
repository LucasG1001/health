export interface MeasurementRow {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  chest_cm: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Measurement {
  id: string;
  measuredOn: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  chestCm: number | null;
  notes: string | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewMeasurement {
  measuredOn: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  chestCm?: number | null;
  notes?: string | null;
}

export type MeasurementPatch = Omit<NewMeasurement, "measuredOn"> & { measuredOn?: string };
