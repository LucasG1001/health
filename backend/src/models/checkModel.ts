import { pool } from "../database/connection.js";
import { APP_TIMEZONE } from "../lib/dateUtils.js";

/**
 * Marca/desmarca o exercício no dia de hoje. A linha é chaveada por (split_id, exercise_id)
 * porque `split_exercises.id` é recriado a cada `replaceExercises` (reordenar, adicionar):
 * chavear por ele apagaria em cascata os checks do dia.
 */
export async function setCheck(
  splitId: string,
  splitExerciseId: string,
  checked: boolean
): Promise<boolean> {
  const owner = await pool.query<{ exercise_id: string }>(
    "SELECT exercise_id FROM split_exercises WHERE id = $1 AND split_id = $2",
    [splitExerciseId, splitId]
  );
  const exerciseId = owner.rows[0]?.exercise_id;
  if (!exerciseId) return false;

  if (checked) {
    await pool.query(
      `INSERT INTO exercise_checks (split_id, exercise_id, checked_on)
       VALUES ($1, $2, (NOW() AT TIME ZONE $3)::date)
       ON CONFLICT (split_id, exercise_id, checked_on) DO NOTHING`,
      [splitId, exerciseId, APP_TIMEZONE]
    );
  } else {
    await pool.query(
      `DELETE FROM exercise_checks
        WHERE split_id = $1 AND exercise_id = $2
          AND checked_on = (NOW() AT TIME ZONE $3)::date`,
      [splitId, exerciseId, APP_TIMEZONE]
    );
  }
  return true;
}
