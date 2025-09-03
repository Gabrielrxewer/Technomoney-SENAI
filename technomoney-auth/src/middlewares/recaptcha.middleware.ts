import { RequestHandler } from "express";
import { RecaptchaService } from "../services/recaptcha.service";
import { logger } from "../utils/logger";

const recaptcha = new RecaptchaService();

export const requireRecaptcha: RequestHandler = async (req, res, next) => {
  const token = (req.body && (req.body.captchaToken || req.body.captcha)) as
    | string
    | undefined;
  const xff = req.headers["x-forwarded-for"];
  const remoteip =
    (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() || req.ip;
  if (!token) {
    logger.warn({ path: req.path, remoteip }, "recaptcha.missing_token");
    res.status(400).json({ message: "Captcha inválido" });
    return;
  }
  try {
    const ok = await recaptcha.verify(token, remoteip);
    if (!ok) {
      logger.warn({ path: req.path, remoteip }, "recaptcha.invalid");
      res.status(400).json({ message: "Captcha inválido" });
      return;
    }
    logger.debug({ path: req.path, remoteip }, "recaptcha.ok");
    next();
  } catch (err) {
    logger.error({ path: req.path, remoteip, err }, "recaptcha.error");
    res.status(400).json({ message: "Captcha inválido" });
  }
};
