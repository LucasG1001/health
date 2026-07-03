export type GoalStatus = "active" | "achieved" | "abandoned";

export interface GoalRow {
  id: string;
  target_weight_kg: number | null;
  target_body_fat_pct: number | null;
  target_date: string | null;
  start_weight_kg: number | null;
  start_body_fat_pct: number | null;
  status: GoalStatus;
  achieved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Goal {
  id: string;
  targetWeightKg: number | null;
  targetBodyFatPct: number | null;
  targetDate: string | null;
  startWeightKg: number | null;
  startBodyFatPct: number | null;
  status: GoalStatus;
  achievedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  weightProgressPct: number | null;
  bodyFatProgressPct: number | null;
}

export interface NewGoal {
  targetWeightKg?: number | null;
  targetBodyFatPct?: number | null;
  targetDate?: string | null;
}

export interface GoalPatch extends NewGoal {
  status?: GoalStatus;
}
