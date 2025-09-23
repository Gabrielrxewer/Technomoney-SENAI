import type { Request, Response, NextFunction } from "express";

type RequestWithUser = Request & { user?: { acr?: string } };

export const requireAAL2 = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const acr = req.user?.acr;
  if (acr === "aal2") {
    next();
    return;
  }
  res.status(401).json({ stepUp: "totp" });
};
