import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { ActiveGoalExistsError } from "./errors.js";
import type { GoalPatch, GoalRow, NewGoal } from "../types/goal.js";

const UNIQUE_VIOLATION = "23505";

export async function findAll(): Promise<GoalRow[]> {
  const result = await pool.query<GoalRow>("SELECT * FROM goals ORDER BY created_at DESC");
  return result.rows;
}

export async function findActive(): Promise<GoalRow | null> {
  const result = await pool.query<GoalRow>("SELECT * FROM goals WHERE status = 'active' LIMIT 1");
  return result.rows[0] ?? null;
}

export async function findById(id: string): Promise<GoalRow | null> {
  const result = await pool.query<GoalRow>("SELECT * FROM goals WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function create(
  entry: NewGoal,
  start: { weightKg: number | null; bodyFatPct: number | null }
): Promise<GoalRow> {
  try {
    const result = await pool.query<GoalRow>(
      `INSERT INTO goals (target_weight_kg, target_body_fat_pct, target_date, start_weight_kg, start_body_fat_pct)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        entry.targetWeightKg ?? null,
        entry.targetBodyFatPct ?? null,
        entry.targetDate ?? null,
        start.weightKg,
        start.bodyFatPct,
      ]
    );
    return result.rows[0]!;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === UNIQUE_VIOLATION) {
      throw new ActiveGoalExistsError();
    }
    throw error;
  }
}

const COLUMN_MAP: Record<keyof GoalPatch, string> = {
  targetWeightKg: "target_weight_kg",
  targetBodyFatPct: "target_body_fat_pct",
  targetDate: "target_date",
  status: "status",
};

export async function update(id: string, patch: GoalPatch): Promise<GoalRow | null> {
  const { sets, values, nextIndex } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return findById(id);

  if (patch.status === "achieved") {
    sets.push("achieved_at = COALESCE(achieved_at, NOW())");
  } else if (patch.status === "active" || patch.status === "abandoned") {
    sets.push("achieved_at = NULL");
  }

  sets.push("updated_at = NOW()");
  values.push(id);
  try {
    const result = await pool.query<GoalRow>(
      `UPDATE goals SET ${sets.join(", ")} WHERE id = $${nextIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === UNIQUE_VIOLATION) {
      throw new ActiveGoalExistsError();
    }
    throw error;
  }
}

export async function remove(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM goals WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
