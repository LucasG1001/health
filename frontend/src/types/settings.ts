export type WeighInFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "off";

export interface Settings {
  weighInFrequency: WeighInFrequency;
  waterGoalMl: number | null;
  calorieGoalKcal: number | null;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  restWarmupSeconds: number;
  restWorkingSeconds: number;
  updatedAt: string;
}

export interface SettingsInput {
  weighInFrequency?: WeighInFrequency;
  waterGoalMl?: number | null;
  calorieGoalKcal?: number | null;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  wakeLockEnabled?: boolean;
  restWarmupSeconds?: number;
  restWorkingSeconds?: number;
}
