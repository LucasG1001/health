import { describe, expect, it } from "vitest";
import { loadLogQuerySchema } from "./loadLog.js";

describe("loadLogQuerySchema", () => {
  it("usa 100 quando limit não vem", () => {
    expect(loadLogQuerySchema.parse({})).toEqual({ limit: 100 });
  });

  it("converte limit da query string e aceita o máximo", () => {
    expect(loadLogQuerySchema.parse({ limit: "200" }).limit).toBe(200);
  });

  it("recusa limit fora da faixa ou não inteiro", () => {
    for (const limit of ["0", "201", "abc", "1.5"]) {
      expect(loadLogQuerySchema.safeParse({ limit }).success).toBe(false);
    }
  });

  it("aceita before como instante ISO e recusa texto qualquer", () => {
    expect(loadLogQuerySchema.parse({ before: "2026-10-16T13:00:00.000Z" }).before).toBe(
      "2026-10-16T13:00:00.000Z"
    );
    expect(loadLogQuerySchema.safeParse({ before: "ontem" }).success).toBe(false);
  });
});
