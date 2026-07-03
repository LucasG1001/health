import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import multer from "multer";
import { UnsupportedImageError } from "../models/errors.js";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export type UploadSubdir = "photos" | "exercises";

export function ensureUploadDirs(): void {
  for (const subdir of ["photos", "exercises"] as UploadSubdir[]) {
    fs.mkdirSync(path.join(UPLOAD_DIR, subdir), { recursive: true });
  }
}

export function createUploader(subdir: UploadSubdir, options: { allowGif?: boolean } = {}) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_DIR, subdir));
    },
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype];
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
      const allowed = EXT_BY_MIME[file.mimetype] !== undefined;
      const gifBlocked = file.mimetype === "image/gif" && !options.allowGif;
      if (!allowed || gifBlocked) {
        cb(new UnsupportedImageError());
        return;
      }
      cb(null, true);
    },
  });
}

export function relativeUploadPath(subdir: UploadSubdir, filename: string): string {
  return `${subdir}/${filename}`;
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function downloadToUploads(subdir: UploadSubdir, url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const ext = EXT_BY_CONTENT_TYPE[contentType];
    if (!ext) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_SIZE) return null;
    const filename = `${randomUUID()}${ext}`;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, subdir, filename), buffer);
    return relativeUploadPath(subdir, filename);
  } catch {
    return null;
  }
}

export async function removeUploadedFile(filePath: string | null): Promise<void> {
  if (!filePath) return;
  try {
    await fs.promises.unlink(path.join(UPLOAD_DIR, filePath));
  } catch {
    return;
  }
}
