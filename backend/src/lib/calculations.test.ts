import { describe, expect, it } from "vitest";
import { calcAge, calcBmi, calcBmr, calcTdee, deriveBodyMetrics } from "./calculations.js";

describe("calcAge", () => {
  it("conta o ano cheio depois do aniversário", () => {
    expect(calcAge("1990-01-15", "2026-07-03")).toBe(36);
  });

  it("desconta um ano antes do aniversário", () => {
    expect(calcAge("1990-12-25", "2026-07-03")).toBe(35);
  });

  it("trata o dia exato do aniversário", () => {
    expect(calcAge("1990-07-03", "2026-07-03")).toBe(36);
  });
});

describe("calcBmi", () => {
  it("calcula IMC com uma casa decimal", () => {
    expect(calcBmi(80, 180)).toBe(24.7);
  });
});

describe("calcBmr", () => {
  it("aplica Mifflin-St Jeor para homens", () => {
    expect(calcBmr(80, 180, 30, "male")).toBe(1780);
  });

  it("aplica Mifflin-St Jeor para mulheres", () => {
    expect(calcBmr(60, 165, 30, "female")).toBe(1320);
  });
});

describe("calcTdee", () => {
  it("multiplica pelo fator de atividade", () => {
    expect(calcTdee(1780, "moderate")).toBe(2759);
  });
});

describe("deriveBodyMetrics", () => {
  it("retorna null quando faltam dados", () => {
    expect(
      deriveBodyMetrics({
        weightKg: 80,
        heightCm: null,
        birthDate: null,
        biologicalSex: null,
        activityLevel: null,
      })
    ).toEqual({ bmi: null, bmr: null, tdee: null });
  });

  it("aceita zero sem virar null", () => {
    // Antes eram checagens de truthiness: um 0 em qualquer campo anulava o cálculo.
    const derived = deriveBodyMetrics({
      weightKg: 80,
      heightCm: 180,
      birthDate: "2026-01-01",
      biologicalSex: "male",
      activityLevel: "sedentary",
      onIso: "2026-07-03",
    });
    expect(derived.bmr).not.toBeNull();
    expect(derived.tdee).not.toBeNull();
  });

  it("usa a idade da data da medição, não a de hoje", () => {
    const params = {
      weightKg: 80,
      heightCm: 180,
      birthDate: "1990-07-03",
      biologicalSex: "male" as const,
      activityLevel: "moderate" as const,
    };
    const then = deriveBodyMetrics({ ...params, onIso: "2010-07-03" });
    const now = deriveBodyMetrics({ ...params, onIso: "2026-07-03" });
    expect(then.bmr).toBeGreaterThan(now.bmr!);
  });

  it("deriva tudo quando o perfil está completo", () => {
    const derived = deriveBodyMetrics({
      weightKg: 80,
      heightCm: 180,
      birthDate: "1996-01-01",
      biologicalSex: "male",
      activityLevel: "moderate",
    });
    expect(derived.bmi).toBe(24.7);
    expect(derived.bmr).toBeGreaterThan(1600);
    expect(derived.tdee).toBeGreaterThan(derived.bmr!);
  });
});
