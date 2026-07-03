import { pool } from "../database/connection.js";
import type { CatalogExercise, CatalogExerciseRow } from "../types/catalog.js";
import type { MuscleGroup } from "../types/exercise.js";

function toCatalogExercise(row: CatalogExerciseRow): CatalogExercise {
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    muscleGroup: row.muscle_group,
    primaryMuscle: row.primary_muscle,
    equipment: row.equipment,
    level: row.level,
    category: row.category,
    imageUrls: row.image_urls,
    instructions: row.instructions,
    importedExerciseId: row.imported_exercise_id ?? null,
  };
}

export async function count(): Promise<number> {
  const result = await pool.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM catalog_exercises");
  return result.rows[0]?.count ?? 0;
}

export async function search(filters: {
  query: string | null;
  muscleGroup: MuscleGroup | null;
  limit: number;
}): Promise<CatalogExercise[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.query) {
    values.push(`%${filters.query}%`);
    conditions.push(`ce.name ILIKE $${values.length}`);
  }
  if (filters.muscleGroup) {
    values.push(filters.muscleGroup);
    conditions.push(`ce.muscle_group = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(filters.limit);

  const result = await pool.query<CatalogExerciseRow>(
    `SELECT ce.*, e.id AS imported_exercise_id
       FROM catalog_exercises ce
       LEFT JOIN exercises e ON e.external_id = ce.external_id
       ${where}
      ORDER BY ce.name ASC
      LIMIT $${values.length}`,
    values
  );
  return result.rows.map(toCatalogExercise);
}

export async function findById(id: string): Promise<CatalogExercise | null> {
  const result = await pool.query<CatalogExerciseRow>(
    `SELECT ce.*, e.id AS imported_exercise_id
       FROM catalog_exercises ce
       LEFT JOIN exercises e ON e.external_id = ce.external_id
      WHERE ce.id = $1`,
    [id]
  );
  return result.rows[0] ? toCatalogExercise(result.rows[0]) : null;
}
