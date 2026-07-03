import { pool } from "../database/connection.js";
import { resolveImageUrl } from "./exerciseModel.js";
import { ActiveSessionExistsError, DomainError } from "./errors.js";
import type {
  SessionExercise,
  SessionExerciseRow,
  SessionRow,
  SessionSet,
  SessionSetPatch,
  SessionSetRow,
  SessionStatus,
  SessionSummaryItem,
  WorkoutSession,
} from "../types/session.js";
import type { SetType, SetVariation } from "../types/split.js";

const UNIQUE_VIOLATION = "23505";

function toSet(row: SessionSetRow): SessionSet {
  return {
    id: row.id,
    position: row.position,
    setType: row.set_type,
    variation: row.variation,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    restSeconds: row.rest_seconds,
    weightKg: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    rir: row.rir,
    completedAt: row.completed_at,
  };
}

function toExercise(row: SessionExerciseRow, setRows: SessionSetRow[]): SessionExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    imageUrl: resolveImageUrl(row),
    machineSetting: row.machine_setting,
    position: row.position,
    notes: row.notes,
    sets: setRows.filter((set) => set.session_exercise_id === row.id).map(toSet),
  };
}

function toSession(row: SessionRow, exercises: SessionExercise[]): WorkoutSession {
  return {
    id: row.id,
    splitId: row.split_id,
    splitName: row.split_name,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    totalVolumeKg: row.total_volume_kg,
    notes: row.notes,
    exercises,
  };
}

const EXERCISES_SQL = `
  SELECT se.id, se.session_id, se.exercise_id, se.exercise_name, se.position, se.notes,
         e.muscle_group, e.equipment, e.image_path, e.image_url, e.machine_setting
    FROM session_exercises se
    LEFT JOIN exercises e ON e.id = se.exercise_id
   WHERE se.session_id = $1
   ORDER BY se.position ASC
`;

async function loadNested(sessionRow: SessionRow): Promise<WorkoutSession> {
  const [exercises, sets] = await Promise.all([
    pool.query<SessionExerciseRow>(EXERCISES_SQL, [sessionRow.id]),
    pool.query<SessionSetRow>(
      `SELECT ss.* FROM session_sets ss
         JOIN session_exercises se ON se.id = ss.session_exercise_id
        WHERE se.session_id = $1
        ORDER BY ss.position ASC`,
      [sessionRow.id]
    ),
  ]);
  return toSession(
    sessionRow,
    exercises.rows.map((row) => toExercise(row, sets.rows))
  );
}

export async function findById(id: string): Promise<WorkoutSession | null> {
  const result = await pool.query<SessionRow>("SELECT * FROM workout_sessions WHERE id = $1", [id]);
  if (!result.rows[0]) return null;
  return loadNested(result.rows[0]);
}

export async function findActive(): Promise<WorkoutSession | null> {
  const result = await pool.query<SessionRow>(
    "SELECT * FROM workout_sessions WHERE status = 'in_progress' LIMIT 1"
  );
  if (!result.rows[0]) return null;
  return loadNested(result.rows[0]);
}

interface SummaryRow extends SessionRow {
  exercise_count: number;
  completed_sets: number;
}

export async function list(filters: {
  from: string | null;
  to: string | null;
  status: SessionStatus | null;
  limit: number;
}): Promise<SessionSummaryItem[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`ws.started_at::date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`ws.started_at::date <= $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`ws.status = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(filters.limit);

  const result = await pool.query<SummaryRow>(
    `SELECT ws.*,
            (SELECT COUNT(*)::int FROM session_exercises se WHERE se.session_id = ws.id) AS exercise_count,
            (SELECT COUNT(*)::int FROM session_sets ss
               JOIN session_exercises se ON se.id = ss.session_exercise_id
              WHERE se.session_id = ws.id AND ss.completed_at IS NOT NULL) AS completed_sets
       FROM workout_sessions ws
       ${where}
      ORDER BY ws.started_at DESC
      LIMIT $${values.length}`,
    values
  );

  return result.rows.map((row) => ({
    id: row.id,
    splitId: row.split_id,
    splitName: row.split_name,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    totalVolumeKg: row.total_volume_kg,
    notes: row.notes,
    exerciseCount: row.exercise_count,
    completedSets: row.completed_sets,
  }));
}

interface StartPlanRow {
  split_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_position: number;
  exercise_rest_seconds: number | null;
  set_id: string | null;
  set_position: number | null;
  set_type: SetType | null;
  variation: SetVariation | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  suggested_weight_kg: number | null;
  set_rest_seconds: number | null;
}

export async function start(splitId: string): Promise<WorkoutSession> {
  const split = await pool.query<{ id: string; name: string }>(
    "SELECT id, name FROM workout_splits WHERE id = $1",
    [splitId]
  );
  if (!split.rows[0]) {
    throw new DomainError("Divisão não encontrada.", 404);
  }

  const plan = await pool.query<StartPlanRow>(
    `SELECT se.id AS split_exercise_id, se.exercise_id, e.name AS exercise_name,
            se.position AS exercise_position, se.rest_seconds AS exercise_rest_seconds,
            ps.id AS set_id, ps.position AS set_position, ps.set_type, ps.variation,
            ps.target_reps_min, ps.target_reps_max, ps.suggested_weight_kg,
            ps.rest_seconds AS set_rest_seconds
       FROM split_exercises se
       JOIN exercises e ON e.id = se.exercise_id
       LEFT JOIN planned_sets ps ON ps.split_exercise_id = se.id
      WHERE se.split_id = $1
      ORDER BY se.position ASC, ps.position ASC`,
    [splitId]
  );
  if (plan.rows.length === 0) {
    throw new DomainError("Esta divisão não tem exercícios. Adicione exercícios antes de treinar.", 400);
  }

  const client = await pool.connect();
  let sessionId: string;
  try {
    await client.query("BEGIN");
    const session = await client.query<{ id: string }>(
      `INSERT INTO workout_sessions (split_id, split_name) VALUES ($1, $2) RETURNING id`,
      [splitId, split.rows[0].name]
    );
    sessionId = session.rows[0]!.id;

    const bySplitExercise = new Map<string, StartPlanRow[]>();
    for (const row of plan.rows) {
      const group = bySplitExercise.get(row.split_exercise_id) ?? [];
      group.push(row);
      bySplitExercise.set(row.split_exercise_id, group);
    }

    for (const rows of bySplitExercise.values()) {
      const head = rows[0]!;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO session_exercises (session_id, exercise_id, exercise_name, position)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [sessionId, head.exercise_id, head.exercise_name, head.exercise_position]
      );
      const sessionExerciseId = inserted.rows[0]!.id;

      const plannedSets = rows.filter((row) => row.set_id !== null);
      for (let i = 0; i < plannedSets.length; i++) {
        const set = plannedSets[i]!;
        await client.query(
          `INSERT INTO session_sets
             (session_exercise_id, position, set_type, variation, target_reps_min, target_reps_max, rest_seconds, weight_kg)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sessionExerciseId,
            i,
            set.set_type,
            set.variation,
            set.target_reps_min,
            set.target_reps_max,
            set.set_rest_seconds ?? set.exercise_rest_seconds,
            set.suggested_weight_kg,
          ]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === UNIQUE_VIOLATION) {
      throw new ActiveSessionExistsError();
    }
    throw error;
  } finally {
    client.release();
  }

  const created = await findById(sessionId);
  return created!;
}

export async function updateNotes(id: string, notes: string | null): Promise<boolean> {
  const result = await pool.query(
    "UPDATE workout_sessions SET notes = $2, updated_at = NOW() WHERE id = $1",
    [id, notes]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function remove(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM workout_sessions WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function addExercise(sessionId: string, exerciseId: string): Promise<SessionExercise | null> {
  const session = await pool.query<{ id: string }>(
    "SELECT id FROM workout_sessions WHERE id = $1 AND status = 'in_progress'",
    [sessionId]
  );
  if (!session.rows[0]) return null;

  const exercise = await pool.query<{ id: string; name: string }>(
    "SELECT id, name FROM exercises WHERE id = $1",
    [exerciseId]
  );
  if (!exercise.rows[0]) {
    throw new DomainError("Exercício não encontrado.", 404);
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO session_exercises (session_id, exercise_id, exercise_name, position)
     VALUES ($1, $2, $3,
       (SELECT COALESCE(MAX(position), -1) + 1 FROM session_exercises WHERE session_id = $1))
     RETURNING id`,
    [sessionId, exerciseId, exercise.rows[0].name]
  );
  const sessionExerciseId = inserted.rows[0]!.id;

  for (let i = 0; i < 3; i++) {
    await pool.query(
      `INSERT INTO session_sets (session_exercise_id, position, set_type, variation)
       VALUES ($1, $2, 'working', 'normal')`,
      [sessionExerciseId, i]
    );
  }

  return findExercise(sessionExerciseId);
}

async function findExercise(sessionExerciseId: string): Promise<SessionExercise | null> {
  const exercises = await pool.query<SessionExerciseRow>(
    `SELECT se.id, se.session_id, se.exercise_id, se.exercise_name, se.position, se.notes,
            e.muscle_group, e.equipment, e.image_path, e.image_url, e.machine_setting
       FROM session_exercises se
       LEFT JOIN exercises e ON e.id = se.exercise_id
      WHERE se.id = $1`,
    [sessionExerciseId]
  );
  if (!exercises.rows[0]) return null;

  const sets = await pool.query<SessionSetRow>(
    "SELECT * FROM session_sets WHERE session_exercise_id = $1 ORDER BY position ASC",
    [sessionExerciseId]
  );
  return toExercise(exercises.rows[0], sets.rows);
}

export async function removeExercise(sessionExerciseId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM session_exercises WHERE id = $1", [sessionExerciseId]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateExerciseNotes(sessionExerciseId: string, notes: string | null): Promise<boolean> {
  const result = await pool.query("UPDATE session_exercises SET notes = $2 WHERE id = $1", [
    sessionExerciseId,
    notes,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function addSet(
  sessionExerciseId: string,
  entry: { setType?: SetType; variation?: SetVariation; weightKg?: number | null; reps?: number | null }
): Promise<SessionSet | null> {
  const exercise = await pool.query<{ id: string }>("SELECT id FROM session_exercises WHERE id = $1", [
    sessionExerciseId,
  ]);
  if (!exercise.rows[0]) return null;

  const result = await pool.query<SessionSetRow>(
    `INSERT INTO session_sets (session_exercise_id, position, set_type, variation, weight_kg, reps)
     VALUES ($1,
       (SELECT COALESCE(MAX(position), -1) + 1 FROM session_sets WHERE session_exercise_id = $1),
       $2, $3, $4, $5)
     RETURNING *`,
    [
      sessionExerciseId,
      entry.setType ?? "working",
      entry.variation ?? "normal",
      entry.weightKg ?? null,
      entry.reps ?? null,
    ]
  );
  return toSet(result.rows[0]!);
}

export async function updateSet(id: string, patch: SessionSetPatch): Promise<SessionSet | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const columnPatch: [keyof SessionSetPatch, string][] = [
    ["setType", "set_type"],
    ["variation", "variation"],
    ["weightKg", "weight_kg"],
    ["reps", "reps"],
    ["rpe", "rpe"],
    ["rir", "rir"],
  ];
  for (const [key, column] of columnPatch) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = $${i++}`);
      values.push(patch[key]);
    }
  }
  if (patch.completed === true) {
    sets.push("completed_at = COALESCE(completed_at, NOW())");
  } else if (patch.completed === false) {
    sets.push("completed_at = NULL");
  }

  if (sets.length === 0) {
    const current = await pool.query<SessionSetRow>("SELECT * FROM session_sets WHERE id = $1", [id]);
    return current.rows[0] ? toSet(current.rows[0]) : null;
  }

  values.push(id);
  const result = await pool.query<SessionSetRow>(
    `UPDATE session_sets SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ? toSet(result.rows[0]) : null;
}

export async function removeSet(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM session_sets WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function trainedDates(timezone: string): Promise<string[]> {
  const result = await pool.query<{ date: string }>(
    `SELECT DISTINCT (started_at AT TIME ZONE $1)::date::text AS date
       FROM workout_sessions
      WHERE status = 'completed'
      ORDER BY date ASC`,
    [timezone]
  );
  return result.rows.map((row) => row.date);
}
