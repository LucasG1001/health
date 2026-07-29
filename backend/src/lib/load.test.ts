import { describe, expect, it } from "vitest";
import { totalLoadKg } from "./calculations.js";

describe("totalLoadKg", () => {
  it("soma a pilha do aparelho com o peso adicional", () => {
    expect(totalLoadKg(22.2, 15)).toBe(37.2);
  });

  it("é a própria pilha quando não há adicional", () => {
    expect(totalLoadKg(22.2, null)).toBe(22.2);
    expect(totalLoadKg(22.2, 0)).toBe(22.2);
  });

  it("distingue sem carga registrada de zero", () => {
    // NULL em session_sets.weight_kg significa "não registrado" e é excluído do volume.
    expect(totalLoadKg(null, null)).toBeNull();
    expect(totalLoadKg(0, null)).toBe(0);
    expect(totalLoadKg(null, 15)).toBe(15);
  });
});
