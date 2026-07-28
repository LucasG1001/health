import type { Request, Response, NextFunction } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Rota não encontrada." });
}

function statusOf(err: unknown): number {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number" && status >= 400 && status < 600) return status;
  }
  return 500;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = statusOf(err);
  console.error("Erro não tratado:", err);
  if (res.headersSent) return;
  // JSON malformado chega aqui com status 400 do body-parser; ignorá-lo virava 500.
  res
    .status(status)
    .json({ error: status === 400 ? "Corpo da requisição inválido." : "Erro interno do servidor." });
}
