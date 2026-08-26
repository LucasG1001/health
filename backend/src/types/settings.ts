export type WeighInFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "off";

export interface SettingsRow {
  id: string;
  weigh_in_frequency: WeighInFrequency;
  water_goal_ml: number | null;
  calorie_goal_kcal: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  weighInFrequency: WeighInFrequency;
  waterGoalMl: number | null;
  calorieGoalKcal: number | null;
  updatedAt: Date;
}

export interface SettingsPatch {
  weighInFrequency?: WeighInFrequency;
  waterGoalMl?: number | null;
  calorieGoalKcal?: number | null;
}
