import type { Request, Response } from "express";
import { DomainError } from "../models/errors.js";
import { toDomainError } from "./pgError.js";

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(errorMessage: string, handler: AsyncRoute): AsyncRoute {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const domain = error instanceof DomainError ? error : toDomainError(error);
      if (domain) {
        if (!res.headersSent) res.status(domain.status).json({ error: domain.message });
        return;
      }
      // Todo controller passa por aqui, então sem este log nenhum erro inesperado
      // (SQL, FK, TypeError) aparece em produção.
      console.error(`${req.method} ${req.originalUrl} falhou:`, error);
      if (!res.headersSent) res.status(500).json({ error: errorMessage });
    }
  };
}
