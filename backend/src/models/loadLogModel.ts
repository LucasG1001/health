import type { PoolClient } from "pg";
import { pool } from "../database/connection.js";
import { resolveImageUrl } from "./exerciseModel.js";
import type { LoadChange } from "../lib/loadLog.js";
import type { LoadLogEntry, LoadLogRow } from "../types/loadLog.js";

function toEntry(row: LoadLogRow): LoadLogEntry {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    imageUrl: resolveImageUrl(row),
    imageFocalX: row.image_focal_x ?? 50,
    imageFocalY: row.image_focal_y ?? 50,
    imageZoom: row.image_zoom ?? 1,
    field: row.field === "working_weight_kg" ? "workingWeightKg" : "additionalWeightKg",
    oldValue: row.old_value,
    newValue: row.new_value,
    changedAt: row.changed_at,
  };
}

/**
 * Grava as mudanças dentro da transação de quem alterou a carga. O instante é truncado em
 * milissegundos para o cursor `before` (que volta do JS como Date) bater exatamente.
 */
export async function record(
  client: PoolClient,
  exercise: { id: string; name: string },
  changes: LoadChange[]
): Promise<void> {
  if (changes.length === 0) return;
  await client.query(
    `INSERT INTO exercise_load_logs (exercise_id, exercise_name, field, old_value, new_value, changed_at)
     SELECT $1, $2, x.field, x.old_value, x.new_value, date_trunc('milliseconds', NOW())
       FROM unnest($3::text[], $4::numeric[], $5::numeric[]) AS x(field, old_value, new_value)`,
    [
      exercise.id,
      exercise.name,
      changes.map((change) => change.field),
      changes.map((change) => change.oldValue),
      changes.map((change) => change.newValue),
    ]
  );
}

/**
 * A página nunca corta um instante ao meio: os dois campos de um mesmo save têm o mesmo
 * changed_at, e com o cursor `<` a linha que ficasse para a próxima página sumiria. Por
 * isso a página pode vir com uma linha a mais que `limit`.
 */
export async function list(query: { limit: number; before?: string }): Promise<LoadLogEntry[]> {
  const result = await pool.query<LoadLogRow>(
    `WITH filtered AS (
       SELECT * FROM exercise_load_logs
        WHERE $1::timestamptz IS NULL OR changed_at < $1::timestamptz
     ), page_floor AS (
       SELECT MIN(changed_at) AS floor
         FROM (SELECT changed_at FROM filtered ORDER BY changed_at DESC LIMIT $2) page
     )
     SELECT l.id, l.exercise_id, COALESCE(e.name, l.exercise_name) AS exercise_name, l.field,
            l.old_value, l.new_value, l.changed_at,
            e.image_path, e.image_url, e.image_focal_x, e.image_focal_y, e.image_zoom
       FROM filtered l
       LEFT JOIN exercises e ON e.id = l.exercise_id
      WHERE l.changed_at >= (SELECT floor FROM page_floor)
      ORDER BY l.changed_at DESC, l.field DESC`,
    [query.before ?? null, query.limit]
  );
  return result.rows.map(toEntry);
}
