import type pg from "pg";
import { pool, rollback } from "../database/connection.js";
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
    imageFocalX: row.image_focal_x,
    imageFocalY: row.image_focal_y,
    imageZoom: row.image_zoom,
    machineSetting: row.machine_setting,
    position: row.position,
    restSeconds: row.rest_seconds,
    workingWeightKg: row.working_weight_kg,
    additionalWeightKg: row.additional_weight_kg,
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
  SELECT se.id, se.split_id, se.exercise_id, se.position, se.rest_seconds, se.notes,
         e.working_weight_kg, e.additional_weight_kg,
         e.name AS exercise_name, e.muscle_group, e.equipment, e.image_path, e.image_url,
         e.image_focal_x, e.image_focal_y, e.image_zoom, e.machine_setting,
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
    await rollback(client);
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
        // A carga vive só no catálogo (exercises.working_weight_kg), que é a única lida.
        `INSERT INTO split_exercises (split_id, exercise_id, position, rest_seconds, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [splitId, exercise.exerciseId, i, exercise.restSeconds ?? null, exercise.notes ?? null]
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
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }

  return findById(splitId);
}

/**
 * Reflete a mudança de plano no treino em andamento, se houver. `session_sets` é uma cópia
 * materializada no start, então sem isto a edição só valia para o próximo treino.
 * Séries já concluídas são histórico e nunca são tocadas.
 */
async function syncActiveSession(
  client: pg.PoolClient,
  exerciseId: string,
  input: UpdateExercisePlanInput
): Promise<void> {
  const active = await client.query<{ id: string }>(
    `SELECT se.id
       FROM session_exercises se
       JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE ws.status = 'in_progress' AND se.exercise_id = $1`,
    [exerciseId]
  );
  const sessionExercise = active.rows[0];
  if (!sessionExercise) return;

  const restColumn = input.restSeconds !== undefined ? ", rest_seconds = $4" : "";
  const values: unknown[] = [
    sessionExercise.id,
    input.targetRepsMin,
    input.targetRepsMax ?? null,
    ...(input.restSeconds !== undefined ? [input.restSeconds] : []),
  ];
  await client.query(
    `UPDATE session_sets SET target_reps_min = $2, target_reps_max = $3${restColumn}
      WHERE session_exercise_id = $1 AND completed_at IS NULL`,
    values
  );

  if (input.series === undefined) return;

  const counts = await client.query<{ total: number; done: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS done
       FROM session_sets WHERE session_exercise_id = $1`,
    [sessionExercise.id]
  );
  const { total, done } = counts.rows[0]!;

  if (input.series > total) {
    const template = await client.query<{ rest_seconds: number | null; weight_kg: number | null }>(
      `SELECT rest_seconds, weight_kg FROM session_sets
        WHERE session_exercise_id = $1 ORDER BY position DESC LIMIT 1`,
      [sessionExercise.id]
    );
    const rest = input.restSeconds !== undefined ? input.restSeconds : template.rows[0]?.rest_seconds ?? null;
    for (let position = total; position < input.series; position++) {
      await client.query(
        `INSERT INTO session_sets
           (session_exercise_id, position, target_reps_min, target_reps_max, rest_seconds, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          sessionExercise.id,
          position,
          input.targetRepsMin,
          input.targetRepsMax ?? null,
          rest,
          template.rows[0]?.weight_kg ?? null,
        ]
      );
    }
    return;
  }

  // Nunca abaixo do que já foi feito: as concluídas ficam, mesmo que o plano encolha.
  const toRemove = Math.min(total - input.series, total - done);
  if (toRemove > 0) {
    await client.query(
      `DELETE FROM session_sets WHERE id IN (
         SELECT id FROM session_sets
          WHERE session_exercise_id = $1 AND completed_at IS NULL
          ORDER BY position DESC LIMIT $2
       )`,
      [sessionExercise.id, toRemove]
    );
  }
}

export async function updateExercisePlan(
  splitId: string,
  splitExerciseId: string,
  input: UpdateExercisePlanInput
): Promise<Split | null> {
  const existing = await pool.query<{ id: string; exercise_id: string }>(
    "SELECT id, exercise_id FROM split_exercises WHERE id = $1 AND split_id = $2",
    [splitExerciseId, splitId]
  );
  const splitExercise = existing.rows[0];
  if (!splitExercise) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Só grava o que veio no corpo: com `?? null` um PUT sem restSeconds apagava o
    // descanso configurado do exercício.
    if (input.restSeconds !== undefined) {
      await client.query("UPDATE split_exercises SET rest_seconds = $2 WHERE id = $1", [
        splitExerciseId,
        input.restSeconds,
      ]);
    }
    if (input.series === undefined) {
      // Só os alvos: preserva as linhas (e os ids) das séries planejadas.
      await client.query(
        `UPDATE planned_sets SET target_reps_min = $2, target_reps_max = $3
          WHERE split_exercise_id = $1`,
        [splitExerciseId, input.targetRepsMin, input.targetRepsMax ?? null]
      );
    } else {
      await client.query("DELETE FROM planned_sets WHERE split_exercise_id = $1", [splitExerciseId]);
      for (let position = 0; position < input.series; position++) {
        await client.query(
          `INSERT INTO planned_sets (split_exercise_id, position, target_reps_min, target_reps_max)
           VALUES ($1, $2, $3, $4)`,
          [splitExerciseId, position, input.targetRepsMin, input.targetRepsMax ?? null]
        );
      }
    }
    await client.query("UPDATE workout_splits SET updated_at = NOW() WHERE id = $1", [splitId]);
    await syncActiveSession(client, splitExercise.exercise_id, input);
    await client.query("COMMIT");
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }

  return findById(splitId);
}

