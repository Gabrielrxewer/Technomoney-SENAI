import { RequestHandler } from "express";
import { PwnedService } from "../services/pwned.service";
import { logger } from "../utils/logger";
import { isStrong } from "../utils/password-policy.util";

const pwned = new PwnedService();

export const enforcePasswordPolicy: RequestHandler = async (req, res, next) => {
  const pwd = String(req.body?.password || "");
  if (!isStrong(pwd)) {
    res.status(400).json({ message: "Senha fraca" });
    return;
  }
  const enablePwned =
    String(process.env.PWNED_CHECK || "true").toLowerCase() === "true";
  if (enablePwned) {
    try {
      const count = await pwned.count(pwd);
      logger.debug({ count }, "password.pwned.check");
      if (count > 0) {
        res.status(400).json({ message: "Senha comprometida" });
        return;
      }
    } catch (e) {
      logger.debug({ err: String(e) }, "password.pwned.error");
    }
  }
  next();
};
