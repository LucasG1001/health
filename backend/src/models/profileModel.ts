import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import type { ProfilePatch, ProfileRow } from "../types/profile.js";

export async function get(): Promise<ProfileRow | null> {
  const result = await pool.query<ProfileRow>("SELECT * FROM profile LIMIT 1");
  return result.rows[0] ?? null;
}

const COLUMN_MAP: Record<keyof ProfilePatch, string> = {
  heightCm: "height_cm",
  bloodType: "blood_type",
  birthDate: "birth_date",
  biologicalSex: "biological_sex",
  activityLevel: "activity_level",
  allergies: "allergies",
  medicalConditions: "medical_conditions",
  medications: "medications",
  injuries: "injuries",
};

// A linha única é criada pelo migrate().
export async function upsert(patch: ProfilePatch): Promise<ProfileRow> {
  const { sets, values } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) {
    const current = await get();
    return current!;
  }

  sets.push("updated_at = NOW()");
  const result = await pool.query<ProfileRow>(
    `UPDATE profile SET ${sets.join(", ")} WHERE singleton RETURNING *`,
    values
  );
  return result.rows[0]!;
}
