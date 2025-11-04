import type { Request, Response, NextFunction } from "express";
import type { TechnomoneyAuthenticatedUser } from "../types/technomoney-authenticated-user";

import { TotpService } from "../services/totp.service";

type TotpStatusProvider = Pick<TotpService, "status">;

type RequestWithUser = Request & { user?: TechnomoneyAuthenticatedUser };

let totp: TotpStatusProvider = new TotpService();

export const setTotpService = (override: TotpStatusProvider) => {
  if (!override || typeof override.status !== "function") {
    throw new Error("setTotpService requires an object implementing status(userId)");
  }
  totp = override;
};

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

export const resetTotpService = () => {
  totp = new TotpService();
};
