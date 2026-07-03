import type { Request, Response } from "express";
import { DomainError } from "../models/errors.js";

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(errorMessage: string, handler: AsyncRoute): AsyncRoute {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: errorMessage });
    }
  };
}
