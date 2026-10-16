import {
  INVALID,
  numberToMask,
  parseMaskedNumber,
  parseOptionalInteger,
  parseRequiredInteger,
} from "./numberMask";
import type { SplitExercise } from "../types/split";

export interface PlanFormRaw {
  series: string;
  repsMin: string;
  repsMax: string;
  weight: string;
  additional: string;
}

export interface PlanFormValues {
  series: number;
  targetRepsMin: number;
  targetRepsMax: number | null;
  workingWeightKg: number | null;
  additionalWeightKg: number | null;
}

export type PlanFormResult = { ok: true; values: PlanFormValues } | { ok: false; error: string };

export const DEFAULT_SERIES = 3;
export const DEFAULT_REPS_MIN = 12;

/** Texto dos campos a partir do que está salvo — usado para semear e para desfazer a edição. */
export function planFormOf(exercise: SplitExercise): PlanFormRaw {
  const first = exercise.plannedSets[0];
  return {
    series: String(exercise.plannedSets.length || DEFAULT_SERIES),
    repsMin: String(first?.targetRepsMin ?? DEFAULT_REPS_MIN),
    repsMax: first?.targetRepsMax != null ? String(first.targetRepsMax) : "",
    weight: numberToMask(exercise.workingWeightKg),
    additional: numberToMask(exercise.additionalWeightKg),
  };
}

/**
 * Um valor inválido tem de virar mensagem: descartado em silêncio, a tela voltava ao valor
 * antigo sem dizer nada e o campo ficava com o texto errado.
 */
export function parsePlanForm(raw: PlanFormRaw): PlanFormResult {
  const series = parseRequiredInteger(raw.series, 1);
  const repsMin = parseRequiredInteger(raw.repsMin, 1);
  const repsMax = parseOptionalInteger(raw.repsMax, 1);
  if (series === INVALID || repsMin === INVALID || repsMax === INVALID) {
    return { ok: false, error: "Séries e repetições precisam ser números inteiros maiores que zero." };
  }
  if (repsMax !== null && repsMax < repsMin) {
    return { ok: false, error: "O máximo de repetições não pode ser menor que o mínimo." };
  }
  return {
    ok: true,
    values: {
      series,
      targetRepsMin: repsMin,
      targetRepsMax: repsMax,
      workingWeightKg: parseMaskedNumber(raw.weight),
      additionalWeightKg: parseMaskedNumber(raw.additional),
    },
  };
}

// O campo de carga tem 1 casa, mas o banco guarda 2 (NUMERIC(6,2)): comparar o valor cru
// fazia um 2,25 salvo parecer alterado (o campo mostra 2,3) e ser regravado como 2,3 em
// qualquer edição de séries ou reps.
function sameAtMaskPrecision(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.round(a * 10) === Math.round(b * 10);
}

/** Carga só vai ao servidor quando mudou: o catálogo é compartilhado por todas as divisões. */
export function loadChanged(exercise: SplitExercise, values: PlanFormValues): boolean {
  return (
    !sameAtMaskPrecision(values.workingWeightKg, exercise.workingWeightKg ?? null) ||
    !sameAtMaskPrecision(values.additionalWeightKg, exercise.additionalWeightKg ?? null)
  );
}

export interface PlanSave {
  load: { workingWeightKg: number | null; additionalWeightKg: number | null } | null;
  plan: { series?: number; targetRepsMin: number; targetRepsMax: number | null } | null;
}

/**
 * O que de fato mudou, ou null se nada mudou. `series` só vai quando a quantidade mudou:
 * sem ele o servidor preserva as séries planejadas (e os ids) e só troca os alvos.
 */
export function planPatch(exercise: SplitExercise, values: PlanFormValues): PlanSave | null {
  const first = exercise.plannedSets[0];
  const seriesChanged = values.series !== exercise.plannedSets.length;
  const repsChanged =
    values.targetRepsMin !== first?.targetRepsMin ||
    values.targetRepsMax !== (first?.targetRepsMax ?? null);

  const load = loadChanged(exercise, values)
    ? { workingWeightKg: values.workingWeightKg, additionalWeightKg: values.additionalWeightKg }
    : null;
  const plan =
    seriesChanged || repsChanged
      ? {
          ...(seriesChanged ? { series: values.series } : {}),
          targetRepsMin: values.targetRepsMin,
          targetRepsMax: values.targetRepsMax,
        }
      : null;

  return load || plan ? { load, plan } : null;
}
