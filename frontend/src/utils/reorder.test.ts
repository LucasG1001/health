import { describe, expect, it } from "vitest";
import { moveItem, sameOrder, targetIndexFor } from "./reorder";

describe("moveItem", () => {
  it("move para baixo e para cima sem mutar a lista", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});

describe("targetIndexFor", () => {
  const rects = [
    { top: 0, height: 100 },
    { top: 110, height: 100 },
    { top: 220, height: 100 },
  ];

  it("acha a linha pela metade de cima", () => {
    expect(targetIndexFor(10, rects)).toBe(0);
    expect(targetIndexFor(60, rects)).toBe(1);
    expect(targetIndexFor(200, rects)).toBe(2);
  });

  it("abaixo de tudo é a última", () => {
    expect(targetIndexFor(999, rects)).toBe(2);
  });

  it("ignora linha sem medida", () => {
    expect(targetIndexFor(10, [undefined, ...rects])).toBe(1);
  });
});

describe("sameOrder", () => {
  it("compara pela sequência de ids", () => {
    // Long-press sem mover não pode disparar o PUT que recria as linhas no servidor.
    expect(sameOrder([{ id: "a" }, { id: "b" }], [{ id: "a" }, { id: "b" }])).toBe(true);
    expect(sameOrder([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "a" }])).toBe(false);
    expect(sameOrder([{ id: "a" }], [{ id: "a" }, { id: "b" }])).toBe(false);
  });
});
