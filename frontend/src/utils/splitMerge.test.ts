import { describe, expect, it } from "vitest";
import { applyServerSplit } from "./splitMerge";
import type { Split, SplitExercise } from "../types/split";

function ex(exerciseId: string, checkedToday: boolean): SplitExercise {
  return {
    id: `sx-${exerciseId}`,
    exerciseId,
    name: exerciseId,
    muscleGroup: "chest",
    equipment: null,
    imageUrl: null,
    imageFocalX: 50,
    imageFocalY: 50,
    imageZoom: 1,
    machineSetting: null,
    position: 0,
    checkedToday,
    workingWeightKg: null,
    additionalWeightKg: null,
    videoUrl: null,
    instructions: null,
    notes: null,
    plannedSets: [],
  };
}

function split(exercises: SplitExercise[]): Split {
  return { id: "s", name: "A", weekdays: [], position: 0, exercises, createdAt: "", updatedAt: "" };
}

describe("applyServerSplit", () => {
  it("devolve a divisão do servidor quando não há check em voo", () => {
    const server = split([ex("a", false)]);
    expect(applyServerSplit(server, new Map())).toBe(server);
  });

  it("mantém o check otimista que a resposta ainda não reflete", () => {
    const server = split([ex("a", false), ex("b", true)]);
    const merged = applyServerSplit(server, new Map([["a", true]]));
    expect(merged.exercises.map((e) => e.checkedToday)).toEqual([true, true]);
  });

  it("mantém o desmarcar otimista", () => {
    const server = split([ex("a", true)]);
    expect(applyServerSplit(server, new Map([["a", false]])).exercises[0]!.checkedToday).toBe(false);
  });
});
