import { pool } from "../database/connection.js";
import { APP_TIMEZONE } from "../lib/dateUtils.js";

export interface VolumePoint {
  period: string;
  totalVolumeKg: number;
  sessionCount: number;
}

export async function volumeByPeriod(groupBy: "week" | "month"): Promise<VolumePoint[]> {
  const result = await pool.query<{ period: string; total_volume_kg: number | null; session_count: number }>(
    // started_at é TIMESTAMPTZ: sem o AT TIME ZONE o corte de período usa o fuso do
    // servidor (UTC no container) e joga treinos da noite para o dia seguinte.
    `SELECT DATE_TRUNC($1, started_at AT TIME ZONE $2)::date::text AS period,
            SUM(total_volume_kg) AS total_volume_kg,
            COUNT(*)::int AS session_count
       FROM workout_sessions
      WHERE status = 'completed'
      GROUP BY 1
      ORDER BY 1 ASC`,
    [groupBy, APP_TIMEZONE]
  );
  return result.rows.map((row) => ({
    period: row.period,
    totalVolumeKg: row.total_volume_kg ?? 0,
    sessionCount: row.session_count,
  }));
}
