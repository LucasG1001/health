export type GoalStatus = "active" | "achieved" | "abandoned";

export interface Goal {
  id: string;
  targetWeightKg: number | null;
  targetBodyFatPct: number | null;
  targetDate: string | null;
  startWeightKg: number | null;
  startBodyFatPct: number | null;
  status: GoalStatus;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  weightProgressPct: number | null;
  bodyFatProgressPct: number | null;
}

export interface GoalInput {
  targetWeightKg?: number | null;
  targetBodyFatPct?: number | null;
  targetDate?: string | null;
}
