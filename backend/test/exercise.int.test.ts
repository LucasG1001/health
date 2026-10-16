import { describe, expect, it } from "vitest";
import { createExercise, useTestDb } from "./db.js";
import * as exerciseModel from "../src/models/exerciseModel.js";

useTestDb();

describe("replaceImagePath / clearImagePath", () => {
  it("devolve o exercício atualizado e o caminho anterior", async () => {
    const id = await createExercise("Supino");
    const first = await exerciseModel.replaceImagePath(id, "exercises/a.jpg");
    expect(first?.oldPath).toBeNull();
    expect(first?.exercise.imageUrl).toBe("/uploads/exercises/a.jpg");

    const second = await exerciseModel.replaceImagePath(id, "exercises/b.jpg");
    expect(second?.oldPath).toBe("exercises/a.jpg");

    const cleared = await exerciseModel.clearImagePath(id);
    expect(cleared?.oldPath).toBe("exercises/b.jpg");
    expect(cleared?.exercise.hasUploadedImage).toBe(false);
  });

  it("devolve null para exercício inexistente", async () => {
    const missing = "00000000-0000-0000-0000-000000000000";
    expect(await exerciseModel.replaceImagePath(missing, "exercises/a.jpg")).toBeNull();
    expect(await exerciseModel.clearImagePath(missing)).toBeNull();
  });
});
