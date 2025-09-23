import type { Request, Response, NextFunction } from "express";
import type { TechnomoneyAuthenticatedUser } from "@technomoney/types/express";

import { TotpService } from "../services/totp.service";

type RequestWithUser = Request & { user?: TechnomoneyAuthenticatedUser };

const totp = new TotpService();

export const requireAAL2 = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  const u = req.user;
  if (u && u.acr === "aal2") {
    next();
    return;
  }
  if (!u?.id) {
    res.status(401).json({ stepUp: "login" });
    return;
  }
  const t = await totp.status(u.id);
  if (t) {
    res.status(401).json({ stepUp: "totp" });
    return;
  }
  res.status(401).json({ stepUp: "enroll", options: ["totp"] });
};
