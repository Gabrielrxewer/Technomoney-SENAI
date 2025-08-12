import { Request, Response, NextFunction } from "express";

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
