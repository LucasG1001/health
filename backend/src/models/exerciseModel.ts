import { pool } from "../database/connection.js";
import { buildUpdateSet } from "../lib/sqlUpdate.js";
import { isUniqueViolation } from "../lib/pgError.js";
import { DuplicateExerciseError } from "./errors.js";
import type {
  Exercise,
  ExercisePatch,
  ExerciseRow,
  MuscleGroup,
  NewExercise,
} from "../types/exercise.js";

export function resolveImageUrl(row: { image_path: string | null; image_url: string | null }): string | null {
  if (row.image_path) return `/uploads/${row.image_path}`;
  return row.image_url;
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    imageUrl: resolveImageUrl(row),
    hasUploadedImage: row.image_path !== null,
    imageFocalX: row.image_focal_x,
    imageFocalY: row.image_focal_y,
    imageZoom: row.image_zoom,
    workingWeightKg: row.working_weight_kg,
    additionalWeightKg: row.additional_weight_kg,
    machineSetting: row.machine_setting,
    notes: row.notes,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAll(muscleGroup: MuscleGroup | null): Promise<Exercise[]> {
  const values: unknown[] = [];
  let where = "";
  if (muscleGroup) {
    values.push(muscleGroup);
    where = "WHERE muscle_group = $1";
  }
  const result = await pool.query<ExerciseRow>(
    `SELECT * FROM exercises ${where} ORDER BY name ASC`,
    values
  );
  return result.rows.map(toExercise);
}

export async function findById(id: string): Promise<Exercise | null> {
  const result = await pool.query<ExerciseRow>("SELECT * FROM exercises WHERE id = $1", [id]);
  return result.rows[0] ? toExercise(result.rows[0]) : null;
}

export async function create(entry: NewExercise): Promise<Exercise> {
  try {
    const result = await pool.query<ExerciseRow>(
      `INSERT INTO exercises (name, muscle_group, equipment, image_url, machine_setting, notes, video_url, image_focal_x, image_focal_y, image_zoom, working_weight_kg, additional_weight_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        entry.name,
        entry.muscleGroup,
        entry.equipment ?? null,
        entry.imageUrl ?? null,
        entry.machineSetting ?? null,
        entry.notes ?? null,
        entry.videoUrl ?? null,
        entry.imageFocalX ?? 50,
        entry.imageFocalY ?? 50,
        entry.imageZoom ?? 1,
        entry.workingWeightKg ?? null,
        entry.additionalWeightKg ?? null,
      ]
    );
    return toExercise(result.rows[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateExerciseError();
    throw error;
  }
}

const COLUMN_MAP: Record<keyof ExercisePatch, string> = {
  name: "name",
  muscleGroup: "muscle_group",
  equipment: "equipment",
  imageUrl: "image_url",
  imageFocalX: "image_focal_x",
  imageFocalY: "image_focal_y",
  imageZoom: "image_zoom",
  workingWeightKg: "working_weight_kg",
  additionalWeightKg: "additional_weight_kg",
  machineSetting: "machine_setting",
  notes: "notes",
  videoUrl: "video_url",
};

export async function update(id: string, patch: ExercisePatch): Promise<Exercise | null> {
  const { sets, values, nextIndex } = buildUpdateSet(patch, COLUMN_MAP);
  if (sets.length === 0) return findById(id);

  sets.push("updated_at = NOW()");
  values.push(id);
  try {
    const result = await pool.query<ExerciseRow>(
      `UPDATE exercises SET ${sets.join(", ")} WHERE id = $${nextIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? toExercise(result.rows[0]) : null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateExerciseError();
    throw error;
  }
}

export async function setImagePath(id: string, imagePath: string): Promise<string | null> {
  const result = await pool.query<{ old_path: string | null }>(
    `UPDATE exercises e SET image_path = $2, updated_at = NOW()
     FROM (SELECT id, image_path AS old_path FROM exercises WHERE id = $1) prev
     WHERE e.id = prev.id
     RETURNING prev.old_path`,
    [id, imagePath]
  );
  return result.rows[0]?.old_path ?? null;
}

export async function clearImagePath(id: string): Promise<string | null> {
  const result = await pool.query<{ old_path: string | null }>(
    `UPDATE exercises e SET image_path = NULL, updated_at = NOW()
     FROM (SELECT id, image_path AS old_path FROM exercises WHERE id = $1) prev
     WHERE e.id = prev.id
     RETURNING prev.old_path`,
    [id]
  );
  return result.rows[0]?.old_path ?? null;
}

export async function remove(id: string): Promise<{ imagePath: string | null } | null> {
  const result = await pool.query<{ image_path: string | null }>(
    "DELETE FROM exercises WHERE id = $1 RETURNING image_path",
    [id]
  );
  if (!result.rows[0]) return null;
  return { imagePath: result.rows[0].image_path };
}
