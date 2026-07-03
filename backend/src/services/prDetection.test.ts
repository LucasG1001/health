import { describe, expect, it } from "vitest";
import { detectPrs } from "./prDetection.js";

const supino = { exerciseId: "ex-1", exerciseName: "Supino reto" };

describe("detectPrs", () => {
  it("marca o primeiro registro como baseline", () => {
    const prs = detectPrs([{ ...supino, bestWeightKg: 40, bestSetVolumeKg: 480 }], []);
    expect(prs).toHaveLength(2);
    expect(prs.every((pr) => pr.isBaseline)).toBe(true);
    expect(prs.every((pr) => pr.previousValue === null)).toBe(true);
  });

  it("detecta PR quando supera o recorde vigente", () => {
    const prs = detectPrs(
      [{ ...supino, bestWeightKg: 45, bestSetVolumeKg: 400 }],
      [
        { exerciseId: "ex-1", recordType: "max_weight", value: 40 },
        { exerciseId: "ex-1", recordType: "max_set_volume", value: 480 },
      ]
    );
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({
      recordType: "max_weight",
      value: 45,
      previousValue: 40,
      isBaseline: false,
    });
  });

  it("não detecta nada quando igual ou abaixo do recorde", () => {
    const prs = detectPrs(
      [{ ...supino, bestWeightKg: 40, bestSetVolumeKg: 480 }],
      [
        { exerciseId: "ex-1", recordType: "max_weight", value: 40 },
        { exerciseId: "ex-1", recordType: "max_set_volume", value: 500 },
      ]
    );
    expect(prs).toHaveLength(0);
  });

  it("ignora exercícios sem séries válidas", () => {
    const prs = detectPrs([{ ...supino, bestWeightKg: null, bestSetVolumeKg: null }], []);
    expect(prs).toHaveLength(0);
  });
});
