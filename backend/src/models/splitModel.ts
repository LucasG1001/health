import { pool, rollback } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { APP_TIMEZONE } from "../lib/dateUtils.js";
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
    checkedToday: row.checked_today,
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

// O check do dia vem junto com a divisão: a tela do treino já carrega tudo por findById,
// e um GET separado só para os marcados de hoje duplicaria a ida ao banco.
// A chave é (split_id, exercise_id) e não split_exercises.id porque replaceExercises
// apaga e reinsere as linhas a cada reordenação — o check do dia não pode ir junto.
const EXERCISES_SQL = `
  SELECT se.id, se.split_id, se.exercise_id, se.position, se.notes,
         e.working_weight_kg, e.additional_weight_kg,
         e.name AS exercise_name, e.muscle_group, e.equipment, e.image_path, e.image_url,
         e.image_focal_x, e.image_focal_y, e.image_zoom, e.machine_setting,
         e.video_url, e.notes AS exercise_notes,
         EXISTS (
           SELECT 1 FROM exercise_checks c
            WHERE c.split_id = se.split_id AND c.exercise_id = se.exercise_id
              AND c.checked_on = (NOW() AT TIME ZONE $1)::date
         ) AS checked_today
    FROM split_exercises se
    JOIN exercises e ON e.id = se.exercise_id
`;

export async function findAll(): Promise<Split[]> {
  const [splits, exercises, plannedSets] = await Promise.all([
    pool.query<SplitRow>("SELECT * FROM workout_splits ORDER BY position ASC, created_at ASC"),
    pool.query<SplitExerciseRow>(`${EXERCISES_SQL} ORDER BY se.position ASC`, [APP_TIMEZONE]),
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
    `${EXERCISES_SQL} WHERE se.split_id = $2 ORDER BY se.position ASC`,
    [APP_TIMEZONE, id]
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

    // Dois inserts em lote em vez de um por exercício e um por série planejada: salvar a
    // divisão (reordenar, adicionar exercício) fazia dezenas de idas ao banco.
    if (exercises.length > 0) {
      const inserted = await client.query<{ id: string; position: number }>(
        // A carga vive só no catálogo (exercises.working_weight_kg), que é a única lida.
        `INSERT INTO split_exercises (split_id, exercise_id, position, notes)
         SELECT $1::uuid, x.exercise_id, x.position, x.notes
           FROM unnest($2::uuid[], $3::int[], $4::text[])
             AS x(exercise_id, position, notes)
         RETURNING id, position`,
        [
          splitId,
          exercises.map((exercise) => exercise.exerciseId),
          exercises.map((_, index) => index),
          exercises.map((exercise) => exercise.notes ?? null),
        ]
      );
      const idByPosition = new Map(inserted.rows.map((row) => [row.position, row.id] as const));

      const setExerciseIds: string[] = [];
      const setPositions: number[] = [];
      const setRepsMin: number[] = [];
      const setRepsMax: (number | null)[] = [];
      exercises.forEach((exercise, index) => {
        const splitExerciseId = idByPosition.get(index);
        if (!splitExerciseId) return;
        exercise.plannedSets.forEach((set, position) => {
          setExerciseIds.push(splitExerciseId);
          setPositions.push(position);
          setRepsMin.push(set.targetRepsMin);
          setRepsMax.push(set.targetRepsMax ?? null);
        });
      });

      if (setExerciseIds.length > 0) {
        await client.query(
          `INSERT INTO planned_sets (split_exercise_id, position, target_reps_min, target_reps_max)
           SELECT * FROM unnest($1::uuid[], $2::int[], $3::int[], $4::int[])`,
          [setExerciseIds, setPositions, setRepsMin, setRepsMax]
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

export async function updateExercisePlan(
  splitId: string,
  splitExerciseId: string,
  input: UpdateExercisePlanInput
): Promise<Split | null> {
  const existing = await pool.query<{ id: string }>(
    "SELECT id FROM split_exercises WHERE id = $1 AND split_id = $2",
    [splitExerciseId, splitId]
  );
  if (!existing.rows[0]) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (input.series === undefined) {
      // Só os alvos: preserva as linhas (e os ids) das séries planejadas.
      await client.query(
        `UPDATE planned_sets SET target_reps_min = $2, target_reps_max = $3
          WHERE split_exercise_id = $1`,
        [splitExerciseId, input.targetRepsMin, input.targetRepsMax ?? null]
      );
    } else {
      await client.query("DELETE FROM planned_sets WHERE split_exercise_id = $1", [splitExerciseId]);
      await client.query(
        `INSERT INTO planned_sets (split_exercise_id, position, target_reps_min, target_reps_max)
         SELECT $1::uuid, position, $3, $4 FROM generate_series(0, $2 - 1) AS position`,
        [splitExerciseId, input.series, input.targetRepsMin, input.targetRepsMax ?? null]
      );
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

