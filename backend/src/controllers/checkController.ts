import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { setExerciseCheckSchema } from "../schemas/check.js";
import * as checkModel from "../models/checkModel.js";

export const setExerciseCheck = asyncHandler("Erro ao marcar o exercício.", async (req, res) => {
  const parsed = setExerciseCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const found = await checkModel.setCheck(
    String(req.params.id),
    String(req.params.splitExerciseId),
    parsed.data.checked
  );
  if (!found) {
    res.status(404).json({ error: "Exercício não encontrado nesta divisão." });
    return;
  }
  res.status(204).send();
});
