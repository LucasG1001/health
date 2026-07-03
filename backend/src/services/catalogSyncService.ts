import { pool } from "../database/connection.js";
import { DomainError } from "../models/errors.js";
import type { MuscleGroup } from "../types/exercise.js";

const CATALOG_URL =
  process.env.EXERCISE_CATALOG_URL ||
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE_URL =
  process.env.EXERCISE_CATALOG_IMAGE_BASE ||
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface SourceExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  level: string | null;
  category: string | null;
  instructions: string[];
  images: string[];
}

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  neck: "other",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  abductors: "glutes",
  adductors: "quads",
  calves: "calves",
  abdominals: "abs",
};

function toMuscleGroup(primaryMuscles: string[]): MuscleGroup {
  const first = primaryMuscles[0]?.toLowerCase();
  return (first && MUSCLE_MAP[first]) || "other";
}

export async function syncCatalog(): Promise<{ total: number }> {
  let source: SourceExercise[];
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    source = (await response.json()) as SourceExercise[];
  } catch {
    throw new DomainError("Não foi possível baixar o catálogo de exercícios. Tente novamente.", 502);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const exercise of source) {
      if (!exercise.id || !exercise.name) continue;
      await client.query(
        `INSERT INTO catalog_exercises
           (external_id, name, muscle_group, primary_muscle, equipment, level, category, image_urls, instructions, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (external_id) DO UPDATE SET
           name = EXCLUDED.name,
           muscle_group = EXCLUDED.muscle_group,
           primary_muscle = EXCLUDED.primary_muscle,
           equipment = EXCLUDED.equipment,
           level = EXCLUDED.level,
           category = EXCLUDED.category,
           image_urls = EXCLUDED.image_urls,
           instructions = EXCLUDED.instructions,
           synced_at = NOW()`,
        [
          exercise.id,
          exercise.name,
          toMuscleGroup(exercise.primaryMuscles ?? []),
          exercise.primaryMuscles?.[0] ?? null,
          exercise.equipment ?? null,
          exercise.level ?? null,
          exercise.category ?? null,
          (exercise.images ?? []).map((image) => `${IMAGE_BASE_URL}${image}`),
          exercise.instructions?.length ? exercise.instructions.join("\n") : null,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { total: source.length };
}
