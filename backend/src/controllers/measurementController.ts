import { asyncHandler } from "../lib/asyncHandler.js";
import { parseDateRange, respondValidationError } from "../lib/validation.js";
import { deriveBodyMetrics } from "../lib/calculations.js";
import { createMeasurementSchema, updateMeasurementSchema } from "../schemas/measurement.js";
import * as measurementModel from "../models/measurementModel.js";
import * as profileModel from "../models/profileModel.js";
import type { Measurement, MeasurementRow } from "../types/measurement.js";
import type { ActivityLevel, BiologicalSex, ProfileRow } from "../types/profile.js";

function toMeasurement(row: MeasurementRow, profile: ProfileRow | null): Measurement {
  const derived = deriveBodyMetrics({
    weightKg: row.weight_kg,
    heightCm: profile?.height_cm ?? null,
    birthDate: profile?.birth_date ?? null,
    biologicalSex: (profile?.biological_sex as BiologicalSex | null) ?? null,
    activityLevel: (profile?.activity_level as ActivityLevel | null) ?? null,
  });

  return {
    id: row.id,
    measuredOn: row.measured_on,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
    waistCm: row.waist_cm,
    hipCm: row.hip_cm,
    armCm: row.arm_cm,
    thighCm: row.thigh_cm,
    chestCm: row.chest_cm,
    notes: row.notes,
    bmi: derived.bmi,
    bmr: derived.bmr,
    tdee: derived.tdee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const getAll = asyncHandler("Erro ao buscar as medições.", async (req, res) => {
  const { from, to } = parseDateRange(req);
  const [rows, profile] = await Promise.all([measurementModel.findAll(from, to), profileModel.get()]);
  res.json(rows.map((row) => toMeasurement(row, profile)));
});

export const getLatest = asyncHandler("Erro ao buscar a última medição.", async (_req, res) => {
  const [row, profile] = await Promise.all([measurementModel.findLatest(), profileModel.get()]);
  res.json(row ? toMeasurement(row, profile) : null);
});

export const create = asyncHandler("Erro ao registrar a medição.", async (req, res) => {
  const parsed = createMeasurementSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const [row, profile] = await Promise.all([measurementModel.create(parsed.data), profileModel.get()]);
  res.status(201).json(toMeasurement(row, profile));
});

export const update = asyncHandler("Erro ao atualizar a medição.", async (req, res) => {
  const parsed = updateMeasurementSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const row = await measurementModel.update(String(req.params.id), parsed.data);
  if (!row) {
    res.status(404).json({ error: "Medição não encontrada." });
    return;
  }
  const profile = await profileModel.get();
  res.json(toMeasurement(row, profile));
});

export const remove = asyncHandler("Erro ao remover a medição.", async (req, res) => {
  const removed = await measurementModel.remove(String(req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Medição não encontrada." });
    return;
  }
  res.status(204).send();
});
