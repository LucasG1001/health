import { asyncHandler } from "../lib/asyncHandler.js";
import { syncCatalog } from "../services/catalogSyncService.js";
import * as catalogModel from "../models/catalogModel.js";
import type { MuscleGroup } from "../types/exercise.js";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "other",
];

export const search = asyncHandler("Erro ao buscar no catálogo de exercícios.", async (req, res) => {
  if ((await catalogModel.count()) === 0) {
    await syncCatalog();
  }

  const query = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : null;
  const muscleGroup =
    typeof req.query.muscleGroup === "string" && MUSCLE_GROUPS.includes(req.query.muscleGroup as MuscleGroup)
      ? (req.query.muscleGroup as MuscleGroup)
      : null;
  const limitRaw = Number(req.query.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;

  res.json(await catalogModel.search({ query, muscleGroup, limit }));
});

export const sync = asyncHandler("Erro ao sincronizar o catálogo de exercícios.", async (_req, res) => {
  res.json(await syncCatalog());
});
