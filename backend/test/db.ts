import { afterAll, beforeAll, beforeEach } from "vitest";
import { pool } from "../src/database/connection.js";
import { migrate } from "../src/database/migrate.js";
import { ensureUploadDirs } from "../src/lib/upload.js";

const TABLES = [
  "exercise_load_logs",
  "exercise_checks",
  "planned_sets",
  "split_exercises",
  "workout_splits",
  "exercises",
  "progress_photos",
  "goals",
  "body_measurements",
];

export function useTestDb(): void {
  beforeAll(async () => {
    ensureUploadDirs();
    await migrate();
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE ${TABLES.join(", ")} CASCADE`);
  });
  afterAll(async () => {
    await pool.end();
  });
}

export async function createExercise(name: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    "INSERT INTO exercises (name, muscle_group) VALUES ($1, 'chest') RETURNING id",
    [name]
  );
  return result.rows[0]!.id;
}

export async function createSplit(name = "A"): Promise<string> {
  const result = await pool.query<{ id: string }>(
    "INSERT INTO workout_splits (name) VALUES ($1) RETURNING id",
    [name]
  );
  return result.rows[0]!.id;
}

export { pool };
