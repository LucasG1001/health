import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { settingsUpdateSchema } from "../schemas/settings.js";
import * as settingsModel from "../models/settingsModel.js";

export const get = asyncHandler("Erro ao buscar as configurações.", async (_req, res) => {
  res.json(await settingsModel.get());
});

export const update = asyncHandler("Erro ao salvar as configurações.", async (req, res) => {
  const parsed = settingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.json(await settingsModel.update(parsed.data));
});
