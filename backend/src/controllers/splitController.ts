import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import {
  createSplitSchema,
  replaceSplitExercisesSchema,
  reorderSplitsSchema,
  updateExercisePlanSchema,
  updateSplitSchema,
} from "../schemas/split.js";
import * as splitModel from "../models/splitModel.js";

export const getAll = asyncHandler("Erro ao buscar as divisões.", async (_req, res) => {
  res.json(await splitModel.findAll());
});

export const getById = asyncHandler("Erro ao buscar a divisão.", async (req, res) => {
  const split = await splitModel.findById(String(req.params.id));
  if (!split) {
    res.status(404).json({ error: "Divisão não encontrada." });
    return;
  }
  res.json(split);
});

export const create = asyncHandler("Erro ao criar a divisão.", async (req, res) => {
  const parsed = createSplitSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.status(201).json(await splitModel.create(parsed.data));
});

export const update = asyncHandler("Erro ao atualizar a divisão.", async (req, res) => {
  const parsed = updateSplitSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const split = await splitModel.update(String(req.params.id), parsed.data);
  if (!split) {
    res.status(404).json({ error: "Divisão não encontrada." });
    return;
  }
  res.json(split);
});

export const reorder = asyncHandler("Erro ao reordenar as divisões.", async (req, res) => {
  const parsed = reorderSplitsSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.json(await splitModel.reorder(parsed.data.order));
});

export const replaceExercises = asyncHandler("Erro ao salvar os exercícios da divisão.", async (req, res) => {
  const parsed = replaceSplitExercisesSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const split = await splitModel.replaceExercises(String(req.params.id), parsed.data.exercises);
  if (!split) {
    res.status(404).json({ error: "Divisão não encontrada." });
    return;
  }
  res.json(split);
});

export const updateExercisePlan = asyncHandler("Erro ao atualizar o exercício.", async (req, res) => {
  const parsed = updateExercisePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const split = await splitModel.updateExercisePlan(
    String(req.params.id),
    String(req.params.splitExerciseId),
    parsed.data
  );
  if (!split) {
    res.status(404).json({ error: "Exercício não encontrado nesta divisão." });
    return;
  }
  res.json(split);
});

export const remove = asyncHandler("Erro ao remover a divisão.", async (req, res) => {
  const removed = await splitModel.remove(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Divisão não encontrada." });
    return;
  }
  res.status(204).send();
});
