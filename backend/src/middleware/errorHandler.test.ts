import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { errorHandler } from "./errorHandler.js";

function run(err: unknown) {
  const res = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
  errorHandler(err, {} as Request, res as unknown as Response, () => {});
  return res;
}

describe("errorHandler", () => {
  it("JSON malformado vira 400 com mensagem própria", () => {
    const res = run(Object.assign(new SyntaxError("x"), { status: 400 }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Corpo da requisição inválido." });
  });

  it("corpo grande demais vira 413 com mensagem própria", () => {
    const res = run(Object.assign(new Error("too large"), { status: 413, type: "entity.too.large" }));
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Corpo da requisição grande demais." });
  });

  it("erro sem status vira 500", () => {
    const res = run(new Error("boom"));
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
