import { describe, expect, it } from "vitest";
import { formatLoad, totalLoadKg } from "./format";

describe("totalLoadKg", () => {
  it("soma a pilha com o peso adicional", () => {
    expect(totalLoadKg(22.2, 15)).toBe(37.2);
  });

  it("é a própria pilha quando não há adicional", () => {
    expect(totalLoadKg(22.2, null)).toBe(22.2);
  });

  it("distingue sem carga registrada de zero", () => {
    expect(totalLoadKg(null, null)).toBeNull();
    expect(totalLoadKg(0, null)).toBe(0);
    expect(totalLoadKg(null, 15)).toBe(15);
  });
});

describe("formatLoad", () => {
  it("mostra as duas parcelas quando há adicional", () => {
    expect(formatLoad(22.2, 15)).toBe("22,2 + 15 kg");
  });

  it("mostra só a carga quando não há adicional", () => {
    expect(formatLoad(22.2, null)).toBe("22,2 kg");
    expect(formatLoad(22.2, 0)).toBe("22,2 kg");
  });

  it("mostra travessão sem carga nenhuma", () => {
    expect(formatLoad(null, null)).toBe("—");
  });
});
