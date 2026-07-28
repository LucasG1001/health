import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { isUniqueViolation } from "../lib/pgError.js";
import { DuplicateMeasurementError } from "./errors.js";
import type { MeasurementPatch, MeasurementRow, NewMeasurement } from "../types/measurement.js";

export async function findAll(from: string | null, to: string | null): Promise<MeasurementRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (from) {
    values.push(from);
    conditions.push(`measured_on >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`measured_on <= $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query<MeasurementRow>(
    `SELECT * FROM body_measurements ${where} ORDER BY measured_on ASC`,
    values
  );
  return result.rows;
}

export async function findLatest(): Promise<MeasurementRow | null> {
  const result = await pool.query<MeasurementRow>(
    "SELECT * FROM body_measurements ORDER BY measured_on DESC LIMIT 1"
  );
  return result.rows[0] ?? null;
}

export async function findLatestWithWeight(): Promise<MeasurementRow | null> {
  const result = await pool.query<MeasurementRow>(
    "SELECT * FROM body_measurements WHERE weight_kg IS NOT NULL ORDER BY measured_on DESC LIMIT 1"
  );
  return result.rows[0] ?? null;
}

/**
 * Últimos valores conhecidos de peso e % de gordura, cada um da medição mais recente
 * em que o campo foi preenchido. Usar só a medição mais recente zerava o progresso da
 * meta quando a última medição registrava apenas circunferências.
 */
export async function findLatestValues(): Promise<{ weightKg: number | null; bodyFatPct: number | null }> {
  const result = await pool.query<{ weight_kg: number | null; body_fat_pct: number | null }>(
    `SELECT
       (SELECT weight_kg FROM body_measurements
         WHERE weight_kg IS NOT NULL ORDER BY measured_on DESC LIMIT 1) AS weight_kg,
       (SELECT body_fat_pct FROM body_measurements
         WHERE body_fat_pct IS NOT NULL ORDER BY measured_on DESC LIMIT 1) AS body_fat_pct`
  );
  return {
    weightKg: result.rows[0]?.weight_kg ?? null,
    bodyFatPct: result.rows[0]?.body_fat_pct ?? null,
  };
}

export async function findById(id: string): Promise<MeasurementRow | null> {
  const result = await pool.query<MeasurementRow>("SELECT * FROM body_measurements WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function create(entry: NewMeasurement): Promise<MeasurementRow> {
  try {
    const result = await pool.query<MeasurementRow>(
      `INSERT INTO body_measurements
         (measured_on, weight_kg, body_fat_pct, waist_cm, hip_cm, arm_cm, thigh_cm, chest_cm, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        entry.measuredOn,
        entry.weightKg ?? null,
        entry.bodyFatPct ?? null,
        entry.waistCm ?? null,
        entry.hipCm ?? null,
        entry.armCm ?? null,
        entry.thighCm ?? null,
        entry.chestCm ?? null,
        entry.notes ?? null,
      ]
    );
    return result.rows[0]!;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateMeasurementError();
    throw error;
  }
}

const COLUMN_MAP: Record<keyof MeasurementPatch, string> = {
  measuredOn: "measured_on",
  weightKg: "weight_kg",
  bodyFatPct: "body_fat_pct",
  waistCm: "waist_cm",
  hipCm: "hip_cm",
  armCm: "arm_cm",
  thighCm: "thigh_cm",
  chestCm: "chest_cm",
  notes: "notes",
};

export async function update(id: string, patch: MeasurementPatch): Promise<MeasurementRow | null> {
  const { sets, values, nextIndex } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return findById(id);

  sets.push("updated_at = NOW()");
  values.push(id);
  try {
    const result = await pool.query<MeasurementRow>(
      `UPDATE body_measurements SET ${sets.join(", ")} WHERE id = $${nextIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateMeasurementError();
    throw error;
  }
}

export async function remove(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM body_measurements WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
