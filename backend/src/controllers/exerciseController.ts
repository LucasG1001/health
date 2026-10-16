import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { relativeUploadPath, removeUploadedFile } from "../lib/upload.js";
import { createExerciseSchema, updateExerciseSchema } from "../schemas/exercise.js";
import * as exerciseModel from "../models/exerciseModel.js";
import { MUSCLE_GROUPS, type MuscleGroup } from "../types/exercise.js";

export const getAll = asyncHandler("Erro ao buscar os exercícios.", async (req, res) => {
  const muscleGroup =
    typeof req.query.muscleGroup === "string" && MUSCLE_GROUPS.includes(req.query.muscleGroup as MuscleGroup)
      ? (req.query.muscleGroup as MuscleGroup)
      : null;
  res.json(await exerciseModel.findAll(muscleGroup));
});

export const getById = asyncHandler("Erro ao buscar o exercício.", async (req, res) => {
  const exercise = await exerciseModel.findById(String(req.params.id));
  if (!exercise) {
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }
  res.json(exercise);
});

export const create = asyncHandler("Erro ao criar o exercício.", async (req, res) => {
  const parsed = createExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.status(201).json(await exerciseModel.create(parsed.data));
});

export const update = asyncHandler("Erro ao atualizar o exercício.", async (req, res) => {
  const parsed = updateExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const exercise = await exerciseModel.update(String(req.params.id), parsed.data);
  if (!exercise) {
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }
  res.json(exercise);
});

export const remove = asyncHandler("Erro ao remover o exercício.", async (req, res) => {
  const removed = await exerciseModel.remove(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }
  await removeUploadedFile(removed.imagePath);
  res.status(204).send();
});

export const uploadImage = asyncHandler("Erro ao enviar a imagem.", async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Envie uma imagem no campo 'file'." });
    return;
  }

  const filePath = relativeUploadPath("exercises", file.filename);
  let swap: exerciseModel.ImageSwap | null;
  try {
    swap = await exerciseModel.replaceImagePath(String(req.params.id), filePath);
  } catch (error) {
    // O multer já gravou o arquivo; sem isto ele fica órfão a cada falha do banco.
    await removeUploadedFile(filePath);
    throw error;
  }
  if (!swap) {
    await removeUploadedFile(filePath);
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }
  await removeUploadedFile(swap.oldPath);
  res.json(swap.exercise);
});

export const removeImage = asyncHandler("Erro ao remover a imagem.", async (req, res) => {
  const swap = await exerciseModel.clearImagePath(String(req.params.id));
  if (!swap) {
    res.status(404).json({ error: "Exercício não encontrado." });
    return;
  }
  await removeUploadedFile(swap.oldPath);
  res.json(swap.exercise);
});
