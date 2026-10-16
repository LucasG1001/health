import { afterEach, describe, expect, it, vi } from "vitest";
import { httpUrl, isoDate, pastIsoDate } from "./common.js";

describe("isoDate", () => {
  const schema = isoDate("Data inválida.");

  it("aceita uma data existente", () => {
    expect(schema.safeParse("2026-07-03").success).toBe(true);
  });

  it("recusa data que passa no formato mas não existe no calendário", () => {
    // Antes só havia o regex, e o Postgres recusava depois com um 500 genérico.
    expect(schema.safeParse("2026-02-31").success).toBe(false);
    expect(schema.safeParse("2026-00-10").success).toBe(false);
    expect(schema.safeParse("2026-13-01").success).toBe(false);
  });

  it("aceita 29 de fevereiro em ano bissexto e recusa fora dele", () => {
    expect(schema.safeParse("2024-02-29").success).toBe(true);
    expect(schema.safeParse("2026-02-29").success).toBe(false);
  });

  it("recusa formato diferente de YYYY-MM-DD", () => {
    expect(schema.safeParse("03/07/2026").success).toBe(false);
    expect(schema.safeParse("2026-7-3").success).toBe(false);
  });
});

describe("pastIsoDate", () => {
  const schema = pastIsoDate("Data inválida.");

  it("recusa data futura", () => {
    expect(schema.safeParse("2999-01-01").success).toBe(false);
  });

  it("aceita data passada", () => {
    expect(schema.safeParse("1990-01-15").success).toBe(true);
  });

  describe("no fim da noite em São Paulo", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("recusa o dia seguinte local mesmo com a data UTC já virada", () => {
      // 22h de 15/10 em São Paulo = 01h de 16/10 em UTC.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-16T01:00:00Z"));
      expect(schema.safeParse("2026-10-15").success).toBe(true);
      expect(schema.safeParse("2026-10-16").success).toBe(false);
    });
  });
});

describe("httpUrl", () => {
  const schema = httpUrl("URL inválida.");

  it("aceita http e https", () => {
    expect(schema.safeParse("https://youtu.be/abc").success).toBe(true);
    expect(schema.safeParse("http://exemplo.com/img.png").success).toBe(true);
  });

  it("recusa esquemas que executam no navegador", () => {
    // O valor vai para href/src no frontend.
    expect(schema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(schema.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
  });

  it("recusa texto que não é URL", () => {
    expect(schema.safeParse("exemplo.com").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });
});
