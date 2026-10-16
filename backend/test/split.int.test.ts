import { describe, expect, it } from "vitest";
import { createExercise, createSplit, pool, useTestDb } from "./db.js";
import * as splitModel from "../src/models/splitModel.js";
import * as settingsModel from "../src/models/settingsModel.js";
import { NotFoundError } from "../src/models/errors.js";

useTestDb();

const MISSING = "00000000-0000-0000-0000-000000000000";

async function splitWith(names: string[], sets = 3) {
  const splitId = await createSplit();
  const exerciseIds: string[] = [];
  for (const name of names) exerciseIds.push(await createExercise(name));
  const split = await splitModel.replaceExercises(
    splitId,
    exerciseIds.map((exerciseId) => ({
      exerciseId,
      plannedSets: Array.from({ length: sets }, () => ({ targetRepsMin: 10, targetRepsMax: 12 })),
    }))
  );
  return split!;
}

describe("findById / findAll", () => {
  it("agrupa as séries planejadas no exercício certo", async () => {
    const split = await splitWith(["Supino", "Crucifixo"], 2);
    const [listed] = await splitModel.findAll();
    const byId = await splitModel.findById(split.id);
    for (const s of [split, listed!, byId!]) {
      expect(s.exercises.map((e) => e.name)).toEqual(["Supino", "Crucifixo"]);
      expect(s.exercises.map((e) => e.plannedSets.length)).toEqual([2, 2]);
      const ids = s.exercises.flatMap((e) => e.plannedSets.map((p) => p.id));
      expect(new Set(ids).size).toBe(4);
    }
  });

  it("devolve null para divisão inexistente", async () => {
    expect(await splitModel.findById(MISSING)).toBeNull();
  });
});

describe("update", () => {
  it("devolve a divisão com os exercícios depois de renomear", async () => {
    const split = await splitWith(["Supino"]);
    const updated = await splitModel.update(split.id, { name: "Peito" });
    expect(updated?.name).toBe("Peito");
    expect(updated?.exercises).toHaveLength(1);
  });

  it("devolve null para divisão inexistente", async () => {
    expect(await splitModel.update(MISSING, { name: "X" })).toBeNull();
  });
});

describe("updateExercisePlan", () => {
  it("preserva os ids das séries quando `series` não vem", async () => {
    const split = await splitWith(["Supino"]);
    const before = split.exercises[0]!;
    const after = await splitModel.updateExercisePlan(split.id, before.id, {
      targetRepsMin: 8,
      targetRepsMax: 10,
    });
    const sets = after.exercises[0]!.plannedSets;
    expect(sets.map((s) => s.id)).toEqual(before.plannedSets.map((s) => s.id));
    expect(sets.every((s) => s.targetRepsMin === 8 && s.targetRepsMax === 10)).toBe(true);
  });

  it("recria as séries quando `series` vem", async () => {
    const split = await splitWith(["Supino"]);
    const after = await splitModel.updateExercisePlan(split.id, split.exercises[0]!.id, {
      series: 5,
      targetRepsMin: 6,
    });
    expect(after.exercises[0]!.plannedSets).toHaveLength(5);
  });

  it("recusa o exercício apagado por uma reordenação concorrente em vez de responder sucesso", async () => {
    const split = await splitWith(["Supino"]);
    const stale = split.exercises[0]!.id;

    // Outra transação (o replaceExercises do arrastar) apaga a linha e ainda não commitou.
    const other = await pool.connect();
    try {
      await other.query("BEGIN");
      await other.query("DELETE FROM split_exercises WHERE id = $1", [stale]);
      const pending = splitModel.updateExercisePlan(split.id, stale, { targetRepsMin: 5 });
      const outcome = pending.then(
        () => "resolveu",
        (error: unknown) => error
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      await other.query("COMMIT");
      expect(await outcome).toBeInstanceOf(NotFoundError);
    } finally {
      other.release();
    }
  });

  it("lança NotFoundError para exercício de outra divisão", async () => {
    const split = await splitWith(["Supino"]);
    const otherSplit = await createSplit("B");
    await expect(
      splitModel.updateExercisePlan(otherSplit, split.exercises[0]!.id, { targetRepsMin: 5 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("reorder", () => {
  it("grava a nova ordem", async () => {
    const a = await createSplit("A");
    const b = await createSplit("B");
    const splits = await splitModel.reorder([b, a]);
    expect(splits.map((s) => s.name)).toEqual(["B", "A"]);
  });

  it("recusa id que não existe e não grava nada", async () => {
    const a = await createSplit("A");
    const b = await createSplit("B");
    await expect(splitModel.reorder([b, a, MISSING])).rejects.toBeInstanceOf(NotFoundError);
    const splits = await splitModel.findAll();
    expect(splits.map((s) => s.name)).toEqual(["A", "B"]);
  });
});

describe("settings", () => {
  it("a linha única existe depois do migrate", async () => {
    const rows = await pool.query("SELECT 1 FROM settings");
    expect(rows.rowCount).toBe(1);
    expect((await settingsModel.get()).weighInFrequency).toBe("weekly");
  });
});
