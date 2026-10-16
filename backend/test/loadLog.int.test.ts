import { describe, expect, it } from "vitest";
import { createExercise, pool, useTestDb } from "./db.js";
import * as exerciseModel from "../src/models/exerciseModel.js";
import * as loadLogModel from "../src/models/loadLogModel.js";

useTestDb();

async function logRows() {
  const result = await pool.query<{ field: string; old_value: number | null; new_value: number | null; changed_at: Date }>(
    "SELECT field, old_value, new_value, changed_at FROM exercise_load_logs ORDER BY field"
  );
  return result.rows;
}

describe("registro do log no exerciseModel", () => {
  it("mudar a carga gera uma linha", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 40 });
    const rows = await logRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ field: "working_weight_kg", old_value: null, new_value: 40 });
  });

  it("carga e adicional no mesmo save geram duas linhas com o mesmo instante", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 40, additionalWeightKg: 2.5 });
    const rows = await logRows();
    expect(rows.map((r) => r.field)).toEqual(["additional_weight_kg", "working_weight_kg"]);
    expect(rows[0]!.changed_at.getTime()).toBe(rows[1]!.changed_at.getTime());
  });

  it("renomear ou salvar a mesma carga não gera linha", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 40 });
    await pool.query("DELETE FROM exercise_load_logs");
    await exerciseModel.update(id, { name: "Supino reto" });
    await exerciseModel.update(id, { workingWeightKg: 40, additionalWeightKg: null });
    expect(await logRows()).toHaveLength(0);
  });

  it("criar com carga registra null → valor", async () => {
    await exerciseModel.create({ name: "Leg press", muscleGroup: "quads", workingWeightKg: 120 });
    expect(await logRows()).toEqual([
      expect.objectContaining({ field: "working_weight_kg", old_value: null, new_value: 120 }),
    ]);
  });

  it("criar sem carga não registra nada", async () => {
    await exerciseModel.create({ name: "Prancha", muscleGroup: "abs" });
    expect(await logRows()).toHaveLength(0);
  });

  it("nome duplicado continua virando DuplicateExerciseError e não grava log", async () => {
    const id = await createExercise("Supino");
    await createExercise("Remada");
    await expect(exerciseModel.update(id, { name: "Remada", workingWeightKg: 50 })).rejects.toMatchObject({
      status: 409,
    });
    expect(await logRows()).toHaveLength(0);
  });

  it("devolve null para exercício inexistente", async () => {
    expect(
      await exerciseModel.update("00000000-0000-0000-0000-000000000000", { workingWeightKg: 10 })
    ).toBeNull();
  });
});

describe("loadLogModel.list", () => {
  it("lista do mais novo para o mais velho, com o nome atual e a imagem", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 40 });
    await exerciseModel.update(id, { workingWeightKg: 42.5 });
    await exerciseModel.update(id, { name: "Supino reto" });

    const entries = await loadLogModel.list({ limit: 100 });
    expect(entries.map((e) => [e.oldValue, e.newValue])).toEqual([
      [40, 42.5],
      [null, 40],
    ]);
    expect(entries[0]).toMatchObject({
      exerciseId: id,
      exerciseName: "Supino reto",
      field: "workingWeightKg",
      imageUrl: null,
    });
  });

  it("mantém o log com o nome do exercício excluído", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 40 });
    await exerciseModel.remove(id);
    const [entry] = await loadLogModel.list({ limit: 100 });
    expect(entry).toMatchObject({ exerciseId: null, exerciseName: "Supino" });
  });

  it("pagina com limit e before", async () => {
    const id = await createExercise("Supino");
    for (const kg of [10, 20, 30]) await exerciseModel.update(id, { workingWeightKg: kg });

    const first = await loadLogModel.list({ limit: 2 });
    expect(first.map((e) => e.newValue)).toEqual([30, 20]);
    const rest = await loadLogModel.list({ limit: 2, before: first[1]!.changedAt.toISOString() });
    expect(rest.map((e) => e.newValue)).toEqual([10]);
  });

  it("não divide os dois campos de um save entre páginas", async () => {
    const id = await createExercise("Supino");
    await exerciseModel.update(id, { workingWeightKg: 10, additionalWeightKg: 1 });
    await exerciseModel.update(id, { workingWeightKg: 20 });

    const first = await loadLogModel.list({ limit: 2 });
    expect(first.map((e) => e.newValue)).toEqual([20, 10, 1]);
    const rest = await loadLogModel.list({ limit: 2, before: first[2]!.changedAt.toISOString() });
    expect(rest).toEqual([]);
  });

  it("lista vazia sem erro", async () => {
    expect(await loadLogModel.list({ limit: 10 })).toEqual([]);
  });
});
