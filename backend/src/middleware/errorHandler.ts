import type { Request, Response, NextFunction } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Rota não encontrada." });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Erro não tratado:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erro interno do servidor." });
}
