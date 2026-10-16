import { describe, expect, it } from "vitest";
import { updateGoalSchema } from "./goal.js";

describe("updateGoalSchema", () => {
  it("aceita mudar só a data alvo", () => {
    // A meta já tem alvo no banco; exigir um alvo no corpo recusava o PATCH.
    expect(updateGoalSchema.safeParse({ targetDate: "2026-12-01" }).success).toBe(true);
  });

  it("aceita zerar um alvo só", () => {
    expect(updateGoalSchema.safeParse({ targetWeightKg: null }).success).toBe(true);
  });

  it("aceita mudar só o status", () => {
    expect(updateGoalSchema.safeParse({ status: "achieved" }).success).toBe(true);
  });

  it("recusa zerar os dois alvos de uma vez, com ou sem status", () => {
    expect(updateGoalSchema.safeParse({ targetWeightKg: null, targetBodyFatPct: null }).success).toBe(false);
    expect(
      updateGoalSchema.safeParse({ status: "active", targetWeightKg: null, targetBodyFatPct: null }).success
    ).toBe(false);
  });
});
