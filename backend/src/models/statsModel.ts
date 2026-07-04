import { pool } from "../database/connection.js";

export interface VolumePoint {
  period: string;
  totalVolumeKg: number;
  sessionCount: number;
}

export async function volumeByPeriod(groupBy: "week" | "month"): Promise<VolumePoint[]> {
  const result = await pool.query<{ period: string; total_volume_kg: number | null; session_count: number }>(
    `SELECT DATE_TRUNC($1, started_at)::date::text AS period,
            SUM(total_volume_kg) AS total_volume_kg,
            COUNT(*)::int AS session_count
       FROM workout_sessions
      WHERE status = 'completed'
      GROUP BY 1
      ORDER BY 1 ASC`,
    [groupBy]
  );
  return result.rows.map((row) => ({
    period: row.period,
    totalVolumeKg: row.total_volume_kg ?? 0,
    sessionCount: row.session_count,
  }));
}
