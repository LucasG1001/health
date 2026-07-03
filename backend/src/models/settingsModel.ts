import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import type { Settings, SettingsPatch, SettingsRow } from "../types/settings.js";

function toSettings(row: SettingsRow): Settings {
  return {
    weighInFrequency: row.weigh_in_frequency,
    waterGoalMl: row.water_goal_ml,
    calorieGoalKcal: row.calorie_goal_kcal,
    soundEnabled: row.sound_enabled,
    vibrationEnabled: row.vibration_enabled,
    wakeLockEnabled: row.wake_lock_enabled,
    restWarmupSeconds: row.rest_warmup_seconds,
    restWorkingSeconds: row.rest_working_seconds,
    updatedAt: row.updated_at,
  };
}

async function ensureRow(): Promise<void> {
  await pool.query("INSERT INTO settings (singleton) VALUES (TRUE) ON CONFLICT (singleton) DO NOTHING");
}

export async function get(): Promise<Settings> {
  await ensureRow();
  const result = await pool.query<SettingsRow>("SELECT * FROM settings LIMIT 1");
  return toSettings(result.rows[0]!);
}

const COLUMN_MAP: Record<keyof SettingsPatch, string> = {
  weighInFrequency: "weigh_in_frequency",
  waterGoalMl: "water_goal_ml",
  calorieGoalKcal: "calorie_goal_kcal",
  soundEnabled: "sound_enabled",
  vibrationEnabled: "vibration_enabled",
  wakeLockEnabled: "wake_lock_enabled",
  restWarmupSeconds: "rest_warmup_seconds",
  restWorkingSeconds: "rest_working_seconds",
};

export async function update(patch: SettingsPatch): Promise<Settings> {
  await ensureRow();

  const { sets, values } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return get();

  sets.push("updated_at = NOW()");
  const result = await pool.query<SettingsRow>(
    `UPDATE settings SET ${sets.join(", ")} WHERE singleton RETURNING *`,
    values
  );
  return toSettings(result.rows[0]!);
}
