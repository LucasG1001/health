import { describe, expect, it } from "vitest";
import { loadChanged, parsePlanForm, planFormOf } from "./planForm";
import type { SplitExercise } from "../types/split";

function exercise(overrides: Partial<SplitExercise> = {}): SplitExercise {
  return {
    id: "sx1",
    exerciseId: "e1",
    name: "Supino",
    muscleGroup: "chest",
    equipment: null,
    imageUrl: null,
    imageFocalX: 50,
    imageFocalY: 50,
    imageZoom: 1,
    machineSetting: null,
    position: 0,
    checkedToday: false,
    workingWeightKg: 40,
    additionalWeightKg: 5,
    videoUrl: null,
    instructions: null,
    notes: null,
    plannedSets: [
      { id: "p1", position: 0, targetRepsMin: 8, targetRepsMax: 12 },
      { id: "p2", position: 1, targetRepsMin: 8, targetRepsMax: 12 },
    ],
    ...overrides,
  };
}

const raw = { series: "3", repsMin: "8", repsMax: "12", weight: "40,0", additional: "5,0" };

describe("planFormOf", () => {
  it("semeia os campos com o que está salvo", () => {
    expect(planFormOf(exercise())).toEqual({
      series: "2",
      repsMin: "8",
      repsMax: "12",
      weight: "40,0",
      additional: "5,0",
    });
  });

  it("usa os defaults quando o exercício não tem séries nem carga", () => {
    expect(planFormOf(exercise({ plannedSets: [], workingWeightKg: null, additionalWeightKg: null }))).toEqual({
      series: "3",
      repsMin: "12",
      repsMax: "",
      weight: "",
      additional: "",
    });
  });
});

describe("parsePlanForm", () => {
  it("converte os campos válidos", () => {
    const result = parsePlanForm(raw);
    expect(result).toEqual({
      ok: true,
      values: {
        series: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        workingWeightKg: 40,
        additionalWeightKg: 5,
      },
    });
  });

  it("aceita reps máximas vazias", () => {
    const result = parsePlanForm({ ...raw, repsMax: "" });
    expect(result.ok && result.values.targetRepsMax).toBeNull();
  });

  it("distingue carga vazia (sem carga) de zero", () => {
    const empty = parsePlanForm({ ...raw, weight: "", additional: "" });
    expect(empty.ok && empty.values.workingWeightKg).toBeNull();
    const zero = parsePlanForm({ ...raw, weight: "0,0", additional: "" });
    expect(zero.ok && zero.values.workingWeightKg).toBe(0);
  });

  it("recusa séries e reps não inteiras ou zeradas", () => {
    for (const patch of [{ series: "0" }, { series: "abc" }, { repsMin: "" }, { repsMax: "0" }]) {
      const result = parsePlanForm({ ...raw, ...patch });
      expect(result.ok).toBe(false);
    }
  });

  it("recusa máximo de reps menor que o mínimo", () => {
    const result = parsePlanForm({ ...raw, repsMin: "12", repsMax: "8" });
    expect(result).toEqual({
      ok: false,
      error: "O máximo de repetições não pode ser menor que o mínimo.",
    });
  });
});

describe("loadChanged", () => {
  it("é falso quando as duas parcelas seguem iguais", () => {
    const result = parsePlanForm(raw);
    expect(result.ok && loadChanged(exercise(), result.values)).toBe(false);
  });

  it("é verdadeiro ao limpar a carga", () => {
    const result = parsePlanForm({ ...raw, weight: "" });
    expect(result.ok && loadChanged(exercise(), result.values)).toBe(true);
  });
});
