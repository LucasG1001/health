import type { ExercisePatch } from "../types/exercise.js";
import type { LoadField } from "../types/loadLog.js";

export interface LoadChange {
  field: LoadField;
  oldValue: number | null;
  newValue: number | null;
}

interface CurrentLoad {
  working_weight_kg: number | null;
  additional_weight_kg: number | null;
}

const FIELDS: { field: LoadField; patchKey: "workingWeightKg" | "additionalWeightKg" }[] = [
  { field: "working_weight_kg", patchKey: "workingWeightKg" },
  { field: "additional_weight_kg", patchKey: "additionalWeightKg" },
];

// A coluna é NUMERIC(6,2): o que difere só além da 2ª casa é gravado igual e não é mudança.
function toCents(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

/**
 * Campos de carga que o patch de fato muda. `current` null é exercício novo (sem carga).
 * Campo ausente do patch não muda; null e 0 são diferentes (sem carga × carga zero).
 */
export function loadChanges(current: CurrentLoad | null, patch: ExercisePatch): LoadChange[] {
  const changes: LoadChange[] = [];
  for (const { field, patchKey } of FIELDS) {
    const next = patch[patchKey];
    if (next === undefined) continue;
    const oldValue = current?.[field] ?? null;
    const newValue = next ?? null;
    if (toCents(oldValue) !== toCents(newValue)) changes.push({ field, oldValue, newValue });
  }
  return changes;
}
