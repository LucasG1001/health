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

export interface BadgeWithAward {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  awardedAt: Date | null;
}

export async function allBadges(): Promise<BadgeWithAward[]> {
  const result = await pool.query<{
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    threshold: number;
    awarded_at: Date | null;
  }>(
    `SELECT b.id, b.code, b.name, b.description, b.icon, b.category, b.threshold, ub.awarded_at
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id
      ORDER BY b.category ASC, b.threshold ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    threshold: row.threshold,
    awardedAt: row.awarded_at,
  }));
}

export interface RecentPr {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  value: number;
  previousValue: number | null;
  achievedAt: Date;
}

export async function recentPrs(limit: number): Promise<RecentPr[]> {
  const result = await pool.query<{
    id: string;
    exercise_id: string;
    exercise_name: string;
    record_type: string;
    value: number;
    previous_value: number | null;
    achieved_at: Date;
  }>(
    `SELECT pr.id, pr.exercise_id, e.name AS exercise_name, pr.record_type, pr.value,
            pr.previous_value, pr.achieved_at
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
      WHERE pr.previous_value IS NOT NULL
      ORDER BY pr.achieved_at DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    recordType: row.record_type,
    value: row.value,
    previousValue: row.previous_value,
    achievedAt: row.achieved_at,
  }));
}

export async function totalRealPrs(): Promise<number> {
  const result = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM personal_records WHERE previous_value IS NOT NULL"
  );
  return result.rows[0]?.count ?? 0;
}

export async function totalCompletedSessions(): Promise<number> {
  const result = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM workout_sessions WHERE status = 'completed'"
  );
  return result.rows[0]?.count ?? 0;
}
