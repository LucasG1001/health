import { pool } from "../database/connection.js";
import { APP_TIMEZONE, todayLocalIso } from "../lib/dateUtils.js";
import { SessionAlreadyFinishedError } from "../models/errors.js";
import { computeStreak } from "./streakService.js";
import { detectPrs, type CurrentRecord, type ExerciseBest } from "./prDetection.js";
import type { BadgeSummary, FinishSummary, SessionRow } from "../types/session.js";

interface BestRow {
  exercise_id: string;
  exercise_name: string;
  best_weight_kg: number | null;
  best_set_volume_kg: number | null;
}

interface RecordRow {
  exercise_id: string;
  record_type: "max_weight" | "max_set_volume";
  value: number;
}

interface PendingBadgeRow {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: "sessions" | "streak" | "pr" | "volume";
  threshold: number;
}

export async function finishSession(sessionId: string): Promise<FinishSummary | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sessionResult = await client.query<SessionRow>(
      "SELECT * FROM workout_sessions WHERE id = $1 FOR UPDATE",
      [sessionId]
    );
    const session = sessionResult.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return null;
    }
    if (session.status === "completed") {
      throw new SessionAlreadyFinishedError();
    }

    const totals = await client.query<{ volume: number; completed_sets: number; planned_sets: number }>(
      `SELECT COALESCE(SUM(ss.weight_kg * ss.reps)
                FILTER (WHERE ss.set_type = 'working' AND ss.completed_at IS NOT NULL
                          AND ss.weight_kg IS NOT NULL AND ss.reps IS NOT NULL), 0) AS volume,
              COUNT(*) FILTER (WHERE ss.completed_at IS NOT NULL)::int AS completed_sets,
              COUNT(*)::int AS planned_sets
         FROM session_sets ss
         JOIN session_exercises se ON se.id = ss.session_exercise_id
        WHERE se.session_id = $1`,
      [sessionId]
    );
    const { volume, completed_sets, planned_sets } = totals.rows[0]!;

    const updated = await client.query<{ duration_seconds: number }>(
      `UPDATE workout_sessions
          SET status = 'completed',
              finished_at = NOW(),
              duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::int,
              total_volume_kg = $2,
              updated_at = NOW()
        WHERE id = $1
        RETURNING duration_seconds`,
      [sessionId, volume]
    );
    const durationSeconds = updated.rows[0]!.duration_seconds;

    const bests = await client.query<BestRow>(
      `SELECT se.exercise_id, e.name AS exercise_name,
              MAX(ss.weight_kg) AS best_weight_kg,
              MAX(ss.weight_kg * ss.reps) AS best_set_volume_kg
         FROM session_exercises se
         JOIN exercises e ON e.id = se.exercise_id
         JOIN session_sets ss ON ss.session_exercise_id = se.id
          AND ss.set_type = 'working' AND ss.completed_at IS NOT NULL
          AND ss.weight_kg IS NOT NULL AND ss.reps IS NOT NULL
        WHERE se.session_id = $1 AND se.exercise_id IS NOT NULL
        GROUP BY se.exercise_id, e.name`,
      [sessionId]
    );

    const exerciseIds = bests.rows.map((row) => row.exercise_id);
    const records =
      exerciseIds.length > 0
        ? await client.query<RecordRow>(
            `SELECT exercise_id, record_type, MAX(value) AS value
               FROM personal_records
              WHERE exercise_id = ANY($1::uuid[])
              GROUP BY exercise_id, record_type`,
            [exerciseIds]
          )
        : { rows: [] as RecordRow[] };

    const exerciseBests: ExerciseBest[] = bests.rows.map((row) => ({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      bestWeightKg: row.best_weight_kg,
      bestSetVolumeKg: row.best_set_volume_kg,
    }));
    const currentRecords: CurrentRecord[] = records.rows.map((row) => ({
      exerciseId: row.exercise_id,
      recordType: row.record_type,
      value: row.value,
    }));

    const detected = detectPrs(exerciseBests, currentRecords);
    for (const pr of detected) {
      await client.query(
        `INSERT INTO personal_records (exercise_id, session_id, record_type, value, previous_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [pr.exerciseId, sessionId, pr.recordType, pr.value, pr.previousValue]
      );
    }
    const realPrs = detected.filter((pr) => !pr.isBaseline);

    const trainedDatesResult = await client.query<{ date: string }>(
      `SELECT DISTINCT (started_at AT TIME ZONE $1)::date::text AS date
         FROM workout_sessions
        WHERE status = 'completed'`,
      [APP_TIMEZONE]
    );
    const weekdaysResult = await client.query<{ weekday: number }>(
      "SELECT DISTINCT UNNEST(weekdays) AS weekday FROM workout_splits"
    );
    const streak = computeStreak(
      trainedDatesResult.rows.map((row) => row.date),
      weekdaysResult.rows.map((row) => row.weekday),
      todayLocalIso()
    );

    const countsResult = await client.query<{ total_sessions: number; total_prs: number }>(
      `SELECT (SELECT COUNT(*)::int FROM workout_sessions WHERE status = 'completed') AS total_sessions,
              (SELECT COUNT(*)::int FROM personal_records WHERE previous_value IS NOT NULL) AS total_prs`
    );
    const { total_sessions, total_prs } = countsResult.rows[0]!;

    const pendingBadges = await client.query<PendingBadgeRow>(
      `SELECT b.id, b.code, b.name, b.description, b.icon, b.category, b.threshold
         FROM badges b
         LEFT JOIN user_badges ub ON ub.badge_id = b.id
        WHERE ub.id IS NULL`
    );

    const newBadges: BadgeSummary[] = [];
    for (const badge of pendingBadges.rows) {
      const achieved =
        (badge.category === "sessions" && total_sessions >= badge.threshold) ||
        (badge.category === "streak" && streak.current >= badge.threshold) ||
        (badge.category === "pr" && total_prs >= badge.threshold) ||
        (badge.category === "volume" && volume >= badge.threshold);
      if (!achieved) continue;

      await client.query(
        `INSERT INTO user_badges (badge_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [badge.id, sessionId]
      );
      newBadges.push({
        id: badge.id,
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
      });
    }

    await client.query("COMMIT");

    return {
      durationSeconds,
      totalVolumeKg: volume,
      completedSets: completed_sets,
      plannedSets: planned_sets,
      prs: realPrs.map((pr) => ({
        exerciseId: pr.exerciseId,
        exerciseName: pr.exerciseName,
        recordType: pr.recordType,
        value: pr.value,
        previousValue: pr.previousValue,
      })),
      newBadges,
      currentStreak: streak.current,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
