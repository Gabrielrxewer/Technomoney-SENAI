import { RequestHandler } from "express";
import { RecaptchaService } from "../services/recaptcha.service";
import { logger } from "../utils/logger";

const recaptcha = new RecaptchaService();

export const recaptchaFor = (expectedAction: string): RequestHandler => {
  return async (req, res, next) => {
    const token =
      (req.body &&
        (req.body.recaptchaToken ||
          req.body.captcha ||
          req.body.captchaToken)) ||
      (req.headers["x-recaptcha-token"] as string) ||
      (req.query &&
        ((req.query.recaptchaToken as string) ||
          (req.query.captcha as string) ||
          (req.query.captchaToken as string))) ||
      undefined;
    const remoteip = req.ip;
    if (!token) {
      logger.warn({ path: req.path, remoteip }, "recaptcha.missing_token");
      res.status(400).json({ message: "Captcha inválido" });
      return;
    }
    try {
      const ok = await recaptcha.verify(token, remoteip, expectedAction);
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
};

export const requireRecaptcha: RequestHandler = recaptchaFor(
  process.env.RECAPTCHA_EXPECTED_ACTION || "login"
);
