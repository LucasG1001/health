import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { calcEpley1Rm } from "../lib/calculations.js";
import { DuplicateExerciseError } from "./errors.js";
import type {
  Exercise,
  ExerciseHistoryPoint,
  ExercisePatch,
  ExerciseRow,
  LastPerformance,
  MuscleGroup,
  NewExercise,
} from "../types/exercise.js";

const UNIQUE_VIOLATION = "23505";

export function resolveImageUrl(row: { image_path: string | null; image_url: string | null }): string | null {
  if (row.image_path) return `/uploads/${row.image_path}`;
  return row.image_url;
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    imageUrl: resolveImageUrl(row),
    hasUploadedImage: row.image_path !== null,
    machineSetting: row.machine_setting,
    notes: row.notes,
    externalId: row.external_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAll(muscleGroup: MuscleGroup | null): Promise<Exercise[]> {
  const values: unknown[] = [];
  let where = "";
  if (muscleGroup) {
    values.push(muscleGroup);
    where = "WHERE muscle_group = $1";
  }
  const result = await pool.query<ExerciseRow>(
    `SELECT * FROM exercises ${where} ORDER BY name ASC`,
    values
  );
  return result.rows.map(toExercise);
}

export async function findById(id: string): Promise<Exercise | null> {
  const result = await pool.query<ExerciseRow>("SELECT * FROM exercises WHERE id = $1", [id]);
  return result.rows[0] ? toExercise(result.rows[0]) : null;
}

export async function create(entry: NewExercise): Promise<Exercise> {
  try {
    const result = await pool.query<ExerciseRow>(
      `INSERT INTO exercises (name, muscle_group, equipment, image_url, machine_setting, notes, external_id, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        entry.name,
        entry.muscleGroup,
        entry.equipment ?? null,
        entry.imageUrl ?? null,
        entry.machineSetting ?? null,
        entry.notes ?? null,
        entry.externalId ?? null,
        entry.imagePath ?? null,
      ]
    );
    return toExercise(result.rows[0]!);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === UNIQUE_VIOLATION) {
      throw new DuplicateExerciseError();
    }
    throw error;
  }
}

const COLUMN_MAP: Record<keyof ExercisePatch, string> = {
  name: "name",
  muscleGroup: "muscle_group",
  equipment: "equipment",
  imageUrl: "image_url",
  machineSetting: "machine_setting",
  notes: "notes",
};

export async function update(id: string, patch: ExercisePatch): Promise<Exercise | null> {
  const { sets, values, nextIndex } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return findById(id);

  sets.push("updated_at = NOW()");
  values.push(id);
  try {
    const result = await pool.query<ExerciseRow>(
      `UPDATE exercises SET ${sets.join(", ")} WHERE id = $${nextIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? toExercise(result.rows[0]) : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === UNIQUE_VIOLATION) {
      throw new DuplicateExerciseError();
    }
    throw error;
  }
}

export async function setImagePath(id: string, imagePath: string): Promise<string | null> {
  const result = await pool.query<{ old_path: string | null }>(
    `UPDATE exercises e SET image_path = $2, updated_at = NOW()
     FROM (SELECT id, image_path AS old_path FROM exercises WHERE id = $1) prev
     WHERE e.id = prev.id
     RETURNING prev.old_path`,
    [id, imagePath]
  );
  return result.rows[0]?.old_path ?? null;
}

export async function clearImagePath(id: string): Promise<string | null> {
  const result = await pool.query<{ old_path: string | null }>(
    `UPDATE exercises e SET image_path = NULL, updated_at = NOW()
     FROM (SELECT id, image_path AS old_path FROM exercises WHERE id = $1) prev
     WHERE e.id = prev.id
     RETURNING prev.old_path`,
    [id]
  );
  return result.rows[0]?.old_path ?? null;
}

export async function remove(id: string): Promise<{ imagePath: string | null } | null> {
  const result = await pool.query<{ image_path: string | null }>(
    "DELETE FROM exercises WHERE id = $1 RETURNING image_path",
    [id]
  );
  if (!result.rows[0]) return null;
  return { imagePath: result.rows[0].image_path };
}

export async function updateMachineSetting(id: string, machineSetting: string | null): Promise<boolean> {
  const result = await pool.query(
    "UPDATE exercises SET machine_setting = $2, updated_at = NOW() WHERE id = $1",
    [id, machineSetting]
  );
  return (result.rowCount ?? 0) > 0;
}

interface LastPerformanceSetRow {
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
}

export async function lastPerformance(exerciseId: string): Promise<LastPerformance | null> {
  const latest = await pool.query<{ session_id: string; session_exercise_id: string; date: string }>(
    `SELECT ws.id AS session_id, se.id AS session_exercise_id, ws.started_at::date::text AS date
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
      WHERE se.exercise_id = $1 AND ws.status = 'completed'
      ORDER BY ws.started_at DESC
      LIMIT 1`,
    [exerciseId]
  );
  const head = latest.rows[0];
  if (!head) return null;

  const sets = await pool.query<LastPerformanceSetRow>(
    `SELECT set_type, weight_kg, reps
       FROM session_sets
      WHERE session_exercise_id = $1 AND completed_at IS NOT NULL
      ORDER BY position ASC`,
    [head.session_exercise_id]
  );

  return {
    sessionId: head.session_id,
    date: head.date,
    sets: sets.rows.map((row) => ({
      setType: row.set_type,
      weightKg: row.weight_kg,
      reps: row.reps,
    })),
  };
}

interface HistoryRow {
  session_id: string;
  date: string;
  max_weight_kg: number | null;
  total_volume_kg: number | null;
  working_sets: number;
  best_weight_kg: number | null;
  best_reps: number | null;
}

export async function history(
  exerciseId: string,
  from: string | null,
  to: string | null
): Promise<ExerciseHistoryPoint[]> {
  const values: unknown[] = [exerciseId];
  const conditions: string[] = [];
  if (from) {
    values.push(from);
    conditions.push(`ws.started_at::date >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`ws.started_at::date <= $${values.length}`);
  }
  const extraWhere = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

  const result = await pool.query<HistoryRow>(
    `SELECT ws.id AS session_id,
            ws.started_at::date::text AS date,
            MAX(ss.weight_kg) FILTER (WHERE ss.set_type = 'working') AS max_weight_kg,
            SUM(ss.weight_kg * ss.reps) FILTER (WHERE ss.set_type = 'working') AS total_volume_kg,
            COUNT(*) FILTER (WHERE ss.set_type = 'working')::int AS working_sets,
            (ARRAY_AGG(ss.weight_kg ORDER BY ss.weight_kg * (1 + ss.reps / 30.0) DESC NULLS LAST))[1] AS best_weight_kg,
            (ARRAY_AGG(ss.reps ORDER BY ss.weight_kg * (1 + ss.reps / 30.0) DESC NULLS LAST))[1] AS best_reps
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id AND se.exercise_id = $1
       JOIN session_sets ss ON ss.session_exercise_id = se.id
        AND ss.completed_at IS NOT NULL AND ss.weight_kg IS NOT NULL AND ss.reps IS NOT NULL
      WHERE ws.status = 'completed' ${extraWhere}
      GROUP BY ws.id
      ORDER BY ws.started_at ASC`,
    values
  );

  return result.rows.map((row) => ({
    sessionId: row.session_id,
    date: row.date,
    maxWeightKg: row.max_weight_kg,
    totalVolumeKg: row.total_volume_kg,
    workingSets: row.working_sets,
    estOneRepMax:
      row.best_weight_kg != null && row.best_reps != null
        ? calcEpley1Rm(row.best_weight_kg, row.best_reps)
        : null,
  }));
}
