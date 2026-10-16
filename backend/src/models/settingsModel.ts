import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import type { Settings, SettingsPatch, SettingsRow } from "../types/settings.js";

function toSettings(row: SettingsRow): Settings {
  return {
    weighInFrequency: row.weigh_in_frequency,
    waterGoalMl: row.water_goal_ml,
    calorieGoalKcal: row.calorie_goal_kcal,
    updatedAt: row.updated_at,
  };
}

// A linha única é criada pelo migrate().
export async function get(): Promise<Settings> {
  const result = await pool.query<SettingsRow>("SELECT * FROM settings LIMIT 1");
  return toSettings(result.rows[0]!);
}

const COLUMN_MAP: Record<keyof SettingsPatch, string> = {
  weighInFrequency: "weigh_in_frequency",
  waterGoalMl: "water_goal_ml",
  calorieGoalKcal: "calorie_goal_kcal",
};

export async function update(patch: SettingsPatch): Promise<Settings> {
  const { sets, values } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return get();

  sets.push("updated_at = NOW()");
  const result = await pool.query<SettingsRow>(
    `UPDATE settings SET ${sets.join(", ")} WHERE singleton RETURNING *`,
    values
  );
  return toSettings(result.rows[0]!);
}
