import { describe, expect, it } from "vitest";
import { isUniqueViolation, toDomainError } from "./pgError.js";

function pgError(code: string): Error {
  return Object.assign(new Error("erro do postgres"), { code });
}

describe("isUniqueViolation", () => {
  it("reconhece 23505", () => {
    expect(isUniqueViolation(pgError("23505"))).toBe(true);
  });

  it("ignora outros códigos e valores sem código", () => {
    expect(isUniqueViolation(pgError("23503"))).toBe(false);
    expect(isUniqueViolation(new Error("qualquer"))).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("toDomainError", () => {
  it("traduz entrada inválida em 4xx", () => {
    expect(toDomainError(pgError("22P02"))?.status).toBe(400);
    expect(toDomainError(pgError("22008"))?.status).toBe(400);
    expect(toDomainError(pgError("23514"))?.status).toBe(400);
    expect(toDomainError(pgError("23502"))?.status).toBe(400);
    expect(toDomainError(pgError("23503"))?.status).toBe(409);
  });

  it("devolve mensagem em português", () => {
    expect(toDomainError(pgError("22008"))?.message).toBe("Data inválida.");
  });

  it("não traduz o que não é entrada inválida", () => {
    // Banco fora do ar precisa continuar sendo 500, não 400.
    expect(toDomainError(pgError("08006"))).toBeNull();
    expect(toDomainError(pgError("23505"))).toBeNull();
    expect(toDomainError(new TypeError("boom"))).toBeNull();
  });
});
