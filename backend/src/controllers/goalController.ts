import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { calcProgressPct } from "../lib/calculations.js";
import { createGoalSchema, updateGoalSchema } from "../schemas/goal.js";
import * as goalModel from "../models/goalModel.js";
import * as measurementModel from "../models/measurementModel.js";
import type { Goal, GoalRow } from "../types/goal.js";
import type { MeasurementRow } from "../types/measurement.js";

function toGoal(row: GoalRow, latest: MeasurementRow | null): Goal {
  const currentWeightKg = latest?.weight_kg ?? null;
  const currentBodyFatPct = latest?.body_fat_pct ?? null;

  const weightProgressPct =
    row.target_weight_kg != null && row.start_weight_kg != null && currentWeightKg != null
      ? calcProgressPct(row.start_weight_kg, currentWeightKg, row.target_weight_kg)
      : null;
  const bodyFatProgressPct =
    row.target_body_fat_pct != null && row.start_body_fat_pct != null && currentBodyFatPct != null
      ? calcProgressPct(row.start_body_fat_pct, currentBodyFatPct, row.target_body_fat_pct)
      : null;

  return {
    id: row.id,
    targetWeightKg: row.target_weight_kg,
    targetBodyFatPct: row.target_body_fat_pct,
    targetDate: row.target_date,
    startWeightKg: row.start_weight_kg,
    startBodyFatPct: row.start_body_fat_pct,
    status: row.status,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentWeightKg,
    currentBodyFatPct,
    weightProgressPct,
    bodyFatProgressPct,
  };
}

export const getAll = asyncHandler("Erro ao buscar as metas.", async (_req, res) => {
  const [rows, latest] = await Promise.all([goalModel.findAll(), measurementModel.findLatest()]);
  res.json(rows.map((row) => toGoal(row, latest)));
});

export const getActive = asyncHandler("Erro ao buscar a meta ativa.", async (_req, res) => {
  const [row, latest] = await Promise.all([goalModel.findActive(), measurementModel.findLatest()]);
  res.json(row ? toGoal(row, latest) : null);
});

export const create = asyncHandler("Erro ao criar a meta.", async (req, res) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const latest = await measurementModel.findLatest();
  const row = await goalModel.create(parsed.data, {
    weightKg: latest?.weight_kg ?? null,
    bodyFatPct: latest?.body_fat_pct ?? null,
  });
  res.status(201).json(toGoal(row, latest));
});

export const update = asyncHandler("Erro ao atualizar a meta.", async (req, res) => {
  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const row = await goalModel.update(String(req.params.id), parsed.data);
  if (!row) {
    res.status(404).json({ error: "Meta não encontrada." });
    return;
  }
  const latest = await measurementModel.findLatest();
  res.json(toGoal(row, latest));
});

export const remove = asyncHandler("Erro ao remover a meta.", async (req, res) => {
  const removed = await goalModel.remove(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Meta não encontrada." });
    return;
  }
  res.status(204).send();
});
