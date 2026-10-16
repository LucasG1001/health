import { describe, expect, it } from "vitest";
import { describeChange, groupLoadLog } from "./loadLog";
import type { LoadLogEntry } from "../types/loadLog";

function entry(overrides: Partial<LoadLogEntry>): LoadLogEntry {
  return {
    id: Math.random().toString(36),
    exerciseId: "e1",
    exerciseName: "Supino",
    imageUrl: null,
    imageFocalX: 50,
    imageFocalY: 50,
    imageZoom: 1,
    field: "workingWeightKg",
    oldValue: 40,
    newValue: 42.5,
    changedAt: "2026-10-16T15:00:00.000Z",
    ...overrides,
  };
}

// Dia no fuso do app, independente do fuso da máquina que roda o teste.
const saoPauloDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

describe("groupLoadLog", () => {
  it("junta carga e adicional do mesmo save numa entrada, com o total antes e depois", () => {
    const [day] = groupLoadLog(
      [
        entry({ field: "workingWeightKg", oldValue: 40, newValue: 45 }),
        entry({ field: "additionalWeightKg", oldValue: null, newValue: 2.5 }),
      ],
      "2026-10-16",
      saoPauloDay
    );
    expect(day!.items).toHaveLength(1);
    const item = day!.items[0]!;
    expect(item.working).toEqual({ oldValue: 40, newValue: 45 });
    expect(item.additional).toEqual({ oldValue: null, newValue: 2.5 });
    expect(item.total).toEqual({ oldValue: 40, newValue: 47.5 });
  });

  it("saves diferentes do mesmo exercício viram entradas separadas e sem total", () => {
    const [day] = groupLoadLog(
      [
        entry({ changedAt: "2026-10-16T15:05:00.000Z", newValue: 45 }),
        entry({ changedAt: "2026-10-16T15:00:00.000Z", field: "additionalWeightKg" }),
      ],
      "2026-10-16",
      saoPauloDay
    );
    expect(day!.items).toHaveLength(2);
    expect(day!.items.every((item) => item.total === null)).toBe(true);
  });

  it("separa por dia local: 23h em São Paulo ainda é o mesmo dia, mesmo já sendo amanhã em UTC", () => {
    const days = groupLoadLog(
      [
        entry({ changedAt: "2026-10-17T02:00:00.000Z" }),
        entry({ changedAt: "2026-10-16T12:00:00.000Z", exerciseId: "e2" }),
        entry({ changedAt: "2026-10-15T12:00:00.000Z", exerciseId: "e3" }),
        entry({ changedAt: "2026-10-01T12:00:00.000Z", exerciseId: "e4" }),
      ],
      "2026-10-16",
      saoPauloDay
    );
    expect(days.map((d) => [d.day, d.label, d.items.length])).toEqual([
      ["2026-10-16", "Hoje", 2],
      ["2026-10-15", "Ontem", 1],
      ["2026-10-01", "01/10/2026", 1],
    ]);
  });

  it("agrupa exercício excluído pelo nome", () => {
    const [day] = groupLoadLog(
      [
        entry({ exerciseId: null, field: "workingWeightKg" }),
        entry({ exerciseId: null, field: "additionalWeightKg" }),
      ],
      "2026-10-16",
      saoPauloDay
    );
    expect(day!.items).toHaveLength(1);
  });
});

describe("describeChange", () => {
  it("subiu e desceu com delta", () => {
    expect(describeChange({ oldValue: 40, newValue: 42.5 })).toEqual({ direction: "up", delta: 2.5 });
    expect(describeChange({ oldValue: 40, newValue: 35 })).toEqual({ direction: "down", delta: -5 });
  });

  it("definiu (sem carga → valor) e limpou (valor → sem carga) não têm delta", () => {
    expect(describeChange({ oldValue: null, newValue: 0 })).toEqual({ direction: "set", delta: null });
    expect(describeChange({ oldValue: 10, newValue: null })).toEqual({ direction: "cleared", delta: null });
  });

  it("corrige o ruído de ponto flutuante do delta", () => {
    expect(describeChange({ oldValue: 0.1, newValue: 0.3 }).delta).toBe(0.2);
  });
});
