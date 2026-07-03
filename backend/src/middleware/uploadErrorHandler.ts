import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { DomainError } from "../models/errors.js";

export function uploadErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Arquivo excede o limite de 10MB."
        : "Falha ao receber o arquivo enviado.";
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof DomainError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}
