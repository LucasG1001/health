import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { loadLogQuerySchema } from "../schemas/loadLog.js";
import * as loadLogModel from "../models/loadLogModel.js";

export const list = asyncHandler("Erro ao buscar o log do treino.", async (req, res) => {
  const parsed = loadLogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  res.json(await loadLogModel.list(parsed.data));
});
