export interface BodyStatPoint {
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  chestCm: number | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
}

export interface VolumePoint {
  period: string;
  totalVolumeKg: number;
  sessionCount: number;
}
