import { describe, expect, it } from "vitest";
import { lastWith } from "./measurements";
import type { Measurement } from "../types/measurement";

function m(measuredOn: string, fields: Partial<Measurement>): Measurement {
  return {
    id: measuredOn,
    measuredOn,
    weightKg: null,
    bodyFatPct: null,
    waistCm: null,
    hipCm: null,
    armCm: null,
    thighCm: null,
    chestCm: null,
    notes: null,
    bmi: null,
    bmr: null,
    tdee: null,
    createdAt: "",
    updatedAt: "",
    ...fields,
  };
}

describe("lastWith", () => {
  const list = [
    m("2026-10-01", { weightKg: 82 }),
    m("2026-10-08", { weightKg: 81 }),
    m("2026-10-10", { waistCm: 90 }),
  ];

  it("pula a medição mais recente que não tem o campo", () => {
    expect(lastWith(list, "weightKg").map((x) => x.measuredOn)).toEqual(["2026-10-08"]);
  });

  it("devolve as duas últimas pesagens para o delta", () => {
    expect(lastWith(list, "weightKg", 2).map((x) => x.weightKg)).toEqual([81, 82]);
  });

  it("devolve vazio quando nenhuma tem o campo", () => {
    expect(lastWith(list, "bodyFatPct")).toEqual([]);
  });
});
