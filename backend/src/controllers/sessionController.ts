import { asyncHandler } from "../lib/asyncHandler.js";
import { parseDateRange, respondValidationError } from "../lib/validation.js";
import {
  addSessionExerciseSchema,
  addSessionSetSchema,
  startSessionSchema,
  updateSessionSchema,
  updateSessionSetSchema,
} from "../schemas/session.js";
import * as sessionModel from "../models/sessionModel.js";
import { finishSession } from "../services/sessionFinishService.js";
import type { SessionStatus } from "../types/session.js";

export const list = asyncHandler("Erro ao buscar os treinos.", async (req, res) => {
  const { from, to } = parseDateRange(req);
  const status =
    req.query.status === "in_progress" || req.query.status === "completed"
      ? (req.query.status as SessionStatus)
      : null;
  const limitRaw = Number(req.query.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 100;
  res.json(await sessionModel.list({ from, to, status, limit }));
});

export const getActive = asyncHandler("Erro ao buscar o treino em andamento.", async (_req, res) => {
  res.json(await sessionModel.findActive());
});

export const getById = asyncHandler("Erro ao buscar o treino.", async (req, res) => {
  const session = await sessionModel.findById(String(req.params.id));
  if (!session) {
    res.status(404).json({ error: "Treino não encontrado." });
    return;
  }
  res.json(session);
});

export const start = asyncHandler("Erro ao iniciar o treino.", async (req, res) => {
  const parsed = startSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.status(201).json(await sessionModel.start(parsed.data.splitId));
});

export const update = asyncHandler("Erro ao atualizar o treino.", async (req, res) => {
  const parsed = updateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const updated = await sessionModel.updateNotes(String(req.params.id), parsed.data.notes ?? null);
  if (!updated) {
    res.status(404).json({ error: "Treino não encontrado." });
    return;
  }
  res.json(await sessionModel.findById(String(req.params.id)));
});

export const finish = asyncHandler("Erro ao finalizar o treino.", async (req, res) => {
  const summary = await finishSession(String(req.params.id));
  if (!summary) {
    res.status(404).json({ error: "Treino não encontrado." });
    return;
  }
  const session = await sessionModel.findById(String(req.params.id));
  res.json({ session, summary });
});

export const remove = asyncHandler("Erro ao descartar o treino.", async (req, res) => {
  const removed = await sessionModel.remove(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Treino não encontrado." });
    return;
  }
  res.status(204).send();
});

export const addExercise = asyncHandler("Erro ao adicionar o exercício.", async (req, res) => {
  const parsed = addSessionExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const exercise = await sessionModel.addExercise(String(req.params.id), parsed.data.exerciseId);
  if (!exercise) {
    res.status(404).json({ error: "Treino em andamento não encontrado." });
    return;
  }
  res.status(201).json(exercise);
});

export const removeExercise = asyncHandler("Erro ao remover o exercício do treino.", async (req, res) => {
  const removed = await sessionModel.removeExercise(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Exercício do treino não encontrado." });
    return;
  }
  res.status(204).send();
});

export const addSet = asyncHandler("Erro ao adicionar a série.", async (req, res) => {
  const parsed = addSessionSetSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const set = await sessionModel.addSet(String(req.params.id), parsed.data);
  if (!set) {
    res.status(404).json({ error: "Exercício do treino não encontrado." });
    return;
  }
  res.status(201).json(set);
});

export const updateSet = asyncHandler("Erro ao atualizar a série.", async (req, res) => {
  const parsed = updateSessionSetSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const set = await sessionModel.updateSet(String(req.params.id), parsed.data);
  if (!set) {
    res.status(404).json({ error: "Série não encontrada." });
    return;
  }
  res.json(set);
});

export const removeSet = asyncHandler("Erro ao remover a série.", async (req, res) => {
  const removed = await sessionModel.removeSet(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Série não encontrada." });
    return;
  }
  res.status(204).send();
});
