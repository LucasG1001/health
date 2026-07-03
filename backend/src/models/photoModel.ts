import { pool } from "../database/connection.js";
import type { PhotoPose, PhotoRow, ProgressPhoto } from "../types/photo.js";

function toPhoto(row: PhotoRow): ProgressPhoto {
  return {
    id: row.id,
    takenOn: row.taken_on,
    pose: row.pose,
    url: `/uploads/${row.file_path}`,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function findAll(
  pose: PhotoPose | null,
  from: string | null,
  to: string | null
): Promise<ProgressPhoto[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (pose) {
    values.push(pose);
    conditions.push(`pose = $${values.length}`);
  }
  if (from) {
    values.push(from);
    conditions.push(`taken_on >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`taken_on <= $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query<PhotoRow>(
    `SELECT * FROM progress_photos ${where} ORDER BY taken_on ASC, created_at ASC`,
    values
  );
  return result.rows.map(toPhoto);
}

export async function create(entry: {
  takenOn: string;
  pose: PhotoPose;
  filePath: string;
  notes: string | null;
}): Promise<ProgressPhoto> {
  const result = await pool.query<PhotoRow>(
    `INSERT INTO progress_photos (taken_on, pose, file_path, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [entry.takenOn, entry.pose, entry.filePath, entry.notes]
  );
  return toPhoto(result.rows[0]!);
}

export async function remove(id: string): Promise<string | null> {
  const result = await pool.query<{ file_path: string }>(
    "DELETE FROM progress_photos WHERE id = $1 RETURNING file_path",
    [id]
  );
  return result.rows[0]?.file_path ?? null;
}
