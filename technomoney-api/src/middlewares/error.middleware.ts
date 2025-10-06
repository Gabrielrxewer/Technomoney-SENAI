import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { AppError } from "../utils/app-error";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: any,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({ err }, "Handled error");
    return res.status(err.status).json({ error: err.message });
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
