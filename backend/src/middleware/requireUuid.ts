import type { RequestHandler } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recusa parâmetros de rota que não são UUID antes de chegar ao SQL, onde virariam
 * um erro 22P02 do Postgres em vez de um 404 honesto.
 */
export function requireUuid(...names: string[]): RequestHandler {
  return (req, res, next) => {
    for (const name of names) {
      const value = req.params[name];
      if (typeof value !== "string" || !UUID_RE.test(value)) {
        res.status(404).json({ error: "Registro não encontrado." });
        return;
      }
    }
    next();
  };
}
