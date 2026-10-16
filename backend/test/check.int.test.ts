import { describe, expect, it } from "vitest";
import { createExercise, createSplit, pool, useTestDb } from "./db.js";
import * as splitModel from "../src/models/splitModel.js";
import * as checkModel from "../src/models/checkModel.js";

useTestDb();

async function setup() {
  const splitId = await createSplit();
  const exerciseId = await createExercise("Supino");
  const split = await splitModel.replaceExercises(splitId, [
    { exerciseId, plannedSets: [{ targetRepsMin: 10 }] },
  ]);
  return { splitId, sxId: split!.exercises[0]!.id };
}

async function checkCount() {
  return (await pool.query("SELECT 1 FROM exercise_checks")).rowCount;
}

describe("setCheck", () => {
  it("marca, é idempotente e desmarca", async () => {
    const { splitId, sxId } = await setup();
    expect(await checkModel.setCheck(splitId, sxId, true)).toBe(true);
    expect(await checkModel.setCheck(splitId, sxId, true)).toBe(true);
    expect(await checkCount()).toBe(1);
    expect((await splitModel.findById(splitId))!.exercises[0]!.checkedToday).toBe(true);

    expect(await checkModel.setCheck(splitId, sxId, false)).toBe(true);
    expect(await checkModel.setCheck(splitId, sxId, false)).toBe(true);
    expect(await checkCount()).toBe(0);
  });

  it("devolve false para exercício que não é da divisão", async () => {
    const { sxId } = await setup();
    const other = await createSplit("B");
    expect(await checkModel.setCheck(other, sxId, true)).toBe(false);
    expect(await checkModel.setCheck(other, sxId, false)).toBe(false);
    expect(await checkCount()).toBe(0);
  });

  it("o check sobrevive a uma reordenação", async () => {
    const { splitId, sxId } = await setup();
    await checkModel.setCheck(splitId, sxId, true);
    const split = await splitModel.findById(splitId);
    const reordered = await splitModel.replaceExercises(
      splitId,
      split!.exercises.map((e) => ({ exerciseId: e.exerciseId, plannedSets: e.plannedSets }))
    );
    expect(reordered!.exercises[0]!.checkedToday).toBe(true);
  });
});
