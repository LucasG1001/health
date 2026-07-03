export type WeighInFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "off";

export interface SettingsRow {
  id: string;
  weigh_in_frequency: WeighInFrequency;
  water_goal_ml: number | null;
  calorie_goal_kcal: number | null;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  wake_lock_enabled: boolean;
  rest_warmup_seconds: number;
  rest_working_seconds: number;
  created_at: Date;
  updated_at: Date;
}

export interface Settings {
  weighInFrequency: WeighInFrequency;
  waterGoalMl: number | null;
  calorieGoalKcal: number | null;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  restWarmupSeconds: number;
  restWorkingSeconds: number;
  updatedAt: Date;
}

export interface SettingsPatch {
  weighInFrequency?: WeighInFrequency;
  waterGoalMl?: number | null;
  calorieGoalKcal?: number | null;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  wakeLockEnabled?: boolean;
  restWarmupSeconds?: number;
  restWorkingSeconds?: number;
}
