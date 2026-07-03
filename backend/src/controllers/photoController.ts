import { asyncHandler } from "../lib/asyncHandler.js";
import { parseDateRange, respondValidationError } from "../lib/validation.js";
import { relativeUploadPath, removeUploadedFile } from "../lib/upload.js";
import { createPhotoSchema } from "../schemas/photo.js";
import * as photoModel from "../models/photoModel.js";
import type { PhotoPose } from "../types/photo.js";

const POSES: PhotoPose[] = ["front", "side", "back"];

export const getAll = asyncHandler("Erro ao buscar as fotos.", async (req, res) => {
  const { from, to } = parseDateRange(req);
  const pose =
    typeof req.query.pose === "string" && POSES.includes(req.query.pose as PhotoPose)
      ? (req.query.pose as PhotoPose)
      : null;
  res.json(await photoModel.findAll(pose, from, to));
});

export const create = asyncHandler("Erro ao enviar a foto.", async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Envie uma imagem no campo 'file'." });
    return;
  }

  const parsed = createPhotoSchema.safeParse(req.body);
  if (!parsed.success) {
    await removeUploadedFile(relativeUploadPath("photos", file.filename));
    respondValidationError(res, parsed.error);
    return;
  }

  const photo = await photoModel.create({
    takenOn: parsed.data.takenOn,
    pose: parsed.data.pose,
    filePath: relativeUploadPath("photos", file.filename),
    notes: parsed.data.notes ?? null,
  });
  res.status(201).json(photo);
});

export const remove = asyncHandler("Erro ao remover a foto.", async (req, res) => {
  const filePath = await photoModel.remove(String(req.params.id));
  if (!filePath) {
    res.status(404).json({ error: "Foto não encontrada." });
    return;
  }
  await removeUploadedFile(filePath);
  res.status(204).send();
});
