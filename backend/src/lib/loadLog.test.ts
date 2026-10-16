import { describe, expect, it } from "vitest";
import { loadChanges } from "./loadLog.js";

const current = { working_weight_kg: 40, additional_weight_kg: null };

describe("loadChanges", () => {
  it("registra só a carga quando só ela muda", () => {
    expect(loadChanges(current, { workingWeightKg: 42.5 })).toEqual([
      { field: "working_weight_kg", oldValue: 40, newValue: 42.5 },
    ]);
  });

  it("registra os dois campos alterados no mesmo save", () => {
    expect(loadChanges(current, { workingWeightKg: 45, additionalWeightKg: 2.5 })).toEqual([
      { field: "working_weight_kg", oldValue: 40, newValue: 45 },
      { field: "additional_weight_kg", oldValue: null, newValue: 2.5 },
    ]);
  });

  it("não registra valor igual ao salvo", () => {
    expect(loadChanges(current, { workingWeightKg: 40, additionalWeightKg: null })).toEqual([]);
  });

  it("não registra diferença que some no arredondamento do NUMERIC(6,2)", () => {
    expect(loadChanges(current, { workingWeightKg: 40.001 })).toEqual([]);
  });

  it("null → 0 é mudança: 0 é carga registrada, null é sem carga", () => {
    expect(loadChanges(current, { additionalWeightKg: 0 })).toEqual([
      { field: "additional_weight_kg", oldValue: null, newValue: 0 },
    ]);
  });

  it("limpar a carga é mudança", () => {
    expect(loadChanges(current, { workingWeightKg: null })).toEqual([
      { field: "working_weight_kg", oldValue: 40, newValue: null },
    ]);
  });

  it("campo ausente do patch não é mudança", () => {
    expect(loadChanges(current, { name: "Supino" } as never)).toEqual([]);
    expect(loadChanges(current, {})).toEqual([]);
  });

  it("exercício novo: compara com sem carga", () => {
    expect(loadChanges(null, { workingWeightKg: 30, additionalWeightKg: null })).toEqual([
      { field: "working_weight_kg", oldValue: null, newValue: 30 },
    ]);
  });
});
