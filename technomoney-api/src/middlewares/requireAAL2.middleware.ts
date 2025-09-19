import type { Request, Response, NextFunction } from "express";

export const requireAAL2 = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as { acr?: string } | undefined;
  if (user?.acr === "aal2") {
    next();
    return;
  }
  res.status(401).json({ stepUp: "totp" });
};
