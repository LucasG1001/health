import { describe, expect, it } from "vitest";
import { useTestDb } from "./db.js";
import * as goalModel from "../src/models/goalModel.js";
import { toDomainError } from "../src/lib/pgError.js";

useTestDb();

describe("meta sem alvo", () => {
  it("o CHECK do banco vira a mensagem de alvo obrigatório", async () => {
    const goal = await goalModel.create({ targetWeightKg: 80 }, { weightKg: 90, bodyFatPct: null });
    const error = await goalModel.update(goal.id, { targetWeightKg: null }).catch((e: unknown) => e);
    expect(toDomainError(error)?.message).toBe("Defina um peso alvo e/ou um % de gordura alvo.");
  });

  it("aceita mudar só a data de uma meta que já tem alvo", async () => {
    const goal = await goalModel.create({ targetWeightKg: 80 }, { weightKg: 90, bodyFatPct: null });
    const updated = await goalModel.update(goal.id, { targetDate: "2026-12-01" });
    expect(updated?.target_date).toBe("2026-12-01");
  });
});
