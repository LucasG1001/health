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
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementInput {
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
