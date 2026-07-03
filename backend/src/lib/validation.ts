import type { Request, Response } from "express";
import type { ZodError } from "zod";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function respondValidationError(
  res: Response,
  error: ZodError,
  fallback = "Dados inválidos."
): void {
  res.status(400).json({ error: error.issues[0]?.message ?? fallback });
}

export function parseDateRange(req: Request): { from: string | null; to: string | null } {
  const from = typeof req.query.from === "string" && DATE_RE.test(req.query.from) ? req.query.from : null;
  const to = typeof req.query.to === "string" && DATE_RE.test(req.query.to) ? req.query.to : null;
  return { from, to };
}
