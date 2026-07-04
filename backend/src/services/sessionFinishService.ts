import { pool } from "../database/connection.js";
import { SessionAlreadyFinishedError } from "../models/errors.js";
import type { FinishSummary, SessionRow } from "../types/session.js";

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

    await client.query("COMMIT");

    return {
      durationSeconds,
      totalVolumeKg: volume,
      completedSets: completed_sets,
      plannedSets: planned_sets,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
