import { describe, expect, it } from "vitest";
import { computeStreak } from "./streakService.js";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

describe("computeStreak", () => {
  it("retorna zero sem treinos", () => {
    expect(computeStreak([], ALL_DAYS, "2026-07-03")).toEqual({ current: 0, longest: 0 });
  });

  it("conta dias consecutivos incluindo hoje", () => {
    const result = computeStreak(["2026-07-01", "2026-07-02", "2026-07-03"], ALL_DAYS, "2026-07-03");
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("não quebra quando hoje ainda não foi treinado", () => {
    const result = computeStreak(["2026-07-01", "2026-07-02"], ALL_DAYS, "2026-07-03");
    expect(result.current).toBe(2);
  });

  it("quebra quando um dia programado foi perdido", () => {
    const result = computeStreak(["2026-06-30", "2026-07-02"], ALL_DAYS, "2026-07-03");
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it("ignora dias não programados no meio da sequência", () => {
    // 2026-07-03 é sexta; programados seg(1), qua(3) e sex(5).
    const result = computeStreak(["2026-06-29", "2026-07-01", "2026-07-03"], [1, 3, 5], "2026-07-03");
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("quebra quando um dia programado da semana foi perdido", () => {
    const result = computeStreak(["2026-06-29", "2026-07-03"], [1, 3, 5], "2026-07-03");
    expect(result.current).toBe(1);
  });

  it("mantém o recorde histórico em longest", () => {
    const result = computeStreak(
      ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-07-03"],
      ALL_DAYS,
      "2026-07-03"
    );
    expect(result.current).toBe(1);
    expect(result.longest).toBe(4);
  });

  it("trata treino em dia não programado sem quebrar a sequência", () => {
    // Sábado (2026-06-27... na verdade 2026-06-27 é sábado) não programado.
    const result = computeStreak(["2026-07-01", "2026-07-03"], [3, 5], "2026-07-03");
    expect(result.current).toBe(2);
  });
});
