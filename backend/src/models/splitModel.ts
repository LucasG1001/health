import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { resolveImageUrl } from "./exerciseModel.js";
import type {
  PlannedSetRow,
  Split,
  SplitExercise,
  SplitExerciseInput,
  SplitExerciseRow,
  SplitRow,
  UpdateExercisePlanInput,
} from "../types/split.js";

function toSplit(row: SplitRow, exercises: SplitExercise[]): Split {
  return {
    id: row.id,
    name: row.name,
    weekdays: row.weekdays,
    position: row.position,
    exercises,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSplitExercise(row: SplitExerciseRow, plannedSetRows: PlannedSetRow[]): SplitExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    name: row.exercise_name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    imageUrl: resolveImageUrl(row),
    machineSetting: row.machine_setting,
    position: row.position,
    restSeconds: row.rest_seconds,
    workingWeightKg: row.working_weight_kg,
    videoUrl: row.video_url,
    instructions: row.exercise_notes,
    notes: row.notes,
    plannedSets: plannedSetRows
      .filter((set) => set.split_exercise_id === row.id)
      .map((set) => ({
        id: set.id,
        position: set.position,
        targetRepsMin: set.target_reps_min,
        targetRepsMax: set.target_reps_max,
      })),
  };
}

const EXERCISES_SQL = `
  SELECT se.id, se.split_id, se.exercise_id, se.position, se.rest_seconds, se.working_weight_kg, se.notes,
         e.name AS exercise_name, e.muscle_group, e.equipment, e.image_path, e.image_url, e.machine_setting,
         e.video_url, e.notes AS exercise_notes
    FROM split_exercises se
    JOIN exercises e ON e.id = se.exercise_id
`;

export async function findAll(): Promise<Split[]> {
  const [splits, exercises, plannedSets] = await Promise.all([
    pool.query<SplitRow>("SELECT * FROM workout_splits ORDER BY position ASC, created_at ASC"),
    pool.query<SplitExerciseRow>(`${EXERCISES_SQL} ORDER BY se.position ASC`),
    pool.query<PlannedSetRow>("SELECT * FROM planned_sets ORDER BY position ASC"),
  ]);

  return splits.rows.map((split) =>
    toSplit(
      split,
      exercises.rows
        .filter((row) => row.split_id === split.id)
        .map((row) => toSplitExercise(row, plannedSets.rows))
    )
  );
}

export async function findById(id: string): Promise<Split | null> {
  const split = await pool.query<SplitRow>("SELECT * FROM workout_splits WHERE id = $1", [id]);
  if (!split.rows[0]) return null;

  const exercises = await pool.query<SplitExerciseRow>(
    `${EXERCISES_SQL} WHERE se.split_id = $1 ORDER BY se.position ASC`,
    [id]
  );
  const plannedSets = await pool.query<PlannedSetRow>(
    `SELECT ps.* FROM planned_sets ps
       JOIN split_exercises se ON se.id = ps.split_exercise_id
      WHERE se.split_id = $1
      ORDER BY ps.position ASC`,
    [id]
  );

  return toSplit(
    split.rows[0],
    exercises.rows.map((row) => toSplitExercise(row, plannedSets.rows))
  );
}

export async function create(entry: { name: string; weekdays: number[] }): Promise<Split> {
  const result = await pool.query<SplitRow>(
    `INSERT INTO workout_splits (name, weekdays, position)
     VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM workout_splits))
     RETURNING *`,
    [entry.name, entry.weekdays]
  );
  return toSplit(result.rows[0]!, []);
}

const COLUMN_MAP: Record<"name" | "weekdays", string> = {
  name: "name",
  weekdays: "weekdays",
};

export async function update(
  id: string,
  patch: { name?: string; weekdays?: number[] }
): Promise<Split | null> {
  const { sets, values, nextIndex } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return findById(id);

  sets.push("updated_at = NOW()");
  values.push(id);
  const result = await pool.query<SplitRow>(
    `UPDATE workout_splits SET ${sets.join(", ")} WHERE id = $${nextIndex} RETURNING id`,
    values
  );
  if (!result.rows[0]) return null;
  return findById(id);
}

export async function reorder(orderedIds: string[]): Promise<Split[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query("UPDATE workout_splits SET position = $1, updated_at = NOW() WHERE id = $2", [
        i,
        orderedIds[i],
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return findAll();
}

export async function remove(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM workout_splits WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function replaceExercises(
  splitId: string,
  exercises: SplitExerciseInput[]
): Promise<Split | null> {
  const existing = await pool.query("SELECT id FROM workout_splits WHERE id = $1", [splitId]);
  if (!existing.rows[0]) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM split_exercises WHERE split_id = $1", [splitId]);

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i]!;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO split_exercises (split_id, exercise_id, position, working_weight_kg, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [splitId, exercise.exerciseId, i, exercise.workingWeightKg ?? null, exercise.notes ?? null]
      );
      const splitExerciseId = inserted.rows[0]!.id;

      for (let j = 0; j < exercise.plannedSets.length; j++) {
        const set = exercise.plannedSets[j]!;
        await client.query(
          `INSERT INTO planned_sets
             (split_exercise_id, position, target_reps_min, target_reps_max)
           VALUES ($1, $2, $3, $4)`,
          [splitExerciseId, j, set.targetRepsMin, set.targetRepsMax ?? null]
        );
      }
    }

    await client.query("UPDATE workout_splits SET updated_at = NOW() WHERE id = $1", [splitId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return findById(splitId);
}

export async function updateExercisePlan(
  splitId: string,
  splitExerciseId: string,
  input: UpdateExercisePlanInput
): Promise<Split | null> {
  const existing = await pool.query(
    "SELECT id FROM split_exercises WHERE id = $1 AND split_id = $2",
    [splitExerciseId, splitId]
  );
  if (!existing.rows[0]) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE split_exercises SET working_weight_kg = $2 WHERE id = $1", [
      splitExerciseId,
      input.workingWeightKg ?? null,
    ]);
    await client.query("DELETE FROM planned_sets WHERE split_exercise_id = $1", [splitExerciseId]);
    for (let position = 0; position < input.series; position++) {
      await client.query(
        `INSERT INTO planned_sets (split_exercise_id, position, target_reps_min, target_reps_max)
         VALUES ($1, $2, $3, $4)`,
        [splitExerciseId, position, input.targetRepsMin, input.targetRepsMax ?? null]
      );
    }
    await client.query("UPDATE workout_splits SET updated_at = NOW() WHERE id = $1", [splitId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return findById(splitId);
}

export async function scheduledWeekdays(): Promise<number[]> {
  const result = await pool.query<{ weekday: number }>(
    "SELECT DISTINCT UNNEST(weekdays) AS weekday FROM workout_splits"
  );
  return result.rows.map((row) => row.weekday);
}
