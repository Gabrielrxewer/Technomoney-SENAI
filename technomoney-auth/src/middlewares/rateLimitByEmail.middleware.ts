import rateLimit from "express-rate-limit";
import { logger } from "../utils/log/logger";
import { makeRateLimitStore } from "./rateLimit.store";

export const loginByEmailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: any) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";
    return `${email}|${req.ip || ""}`;
  },
  handler: (req: any, res: any) => {
    const resetTime = (req as any).rateLimit.resetTime as Date | undefined;
    const now = new Date();
    const secs = resetTime
      ? Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
      : 300;
    logger.warn({ path: req.path, secs }, "rate_limit_email.blocked");
    res
      .status(429)
      .json({
        message: `Muitas tentativas. Tente novamente em ${secs} segundos.`,
        retryAfter: secs,
      });
  },
  store: makeRateLimitStore("rl:email:"),
});
