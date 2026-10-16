import { pool } from "../database/connection.js";
import { APP_TIMEZONE } from "../lib/dateUtils.js";

// Uma instrução só (é o endpoint mais acionado no treino): a CTE `owner` resolve o
// exercise_id e também diz se o split_exercise existe, que é o 404 da rota.
const MARK_SQL = `
  WITH owner AS (
    SELECT split_id, exercise_id FROM split_exercises WHERE id = $1 AND split_id = $2
  ), ins AS (
    INSERT INTO exercise_checks (split_id, exercise_id, checked_on)
    SELECT split_id, exercise_id, (NOW() AT TIME ZONE $3)::date FROM owner
    ON CONFLICT (split_id, exercise_id, checked_on) DO NOTHING
  )
  SELECT EXISTS (SELECT 1 FROM owner) AS found`;

const UNMARK_SQL = `
  WITH owner AS (
    SELECT split_id, exercise_id FROM split_exercises WHERE id = $1 AND split_id = $2
  ), del AS (
    DELETE FROM exercise_checks c USING owner
     WHERE c.split_id = owner.split_id AND c.exercise_id = owner.exercise_id
       AND c.checked_on = (NOW() AT TIME ZONE $3)::date
  )
  SELECT EXISTS (SELECT 1 FROM owner) AS found`;

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
  const result = await pool.query<{ found: boolean }>(checked ? MARK_SQL : UNMARK_SQL, [
    splitExerciseId,
    splitId,
    APP_TIMEZONE,
  ]);
  return result.rows[0]!.found;
}
