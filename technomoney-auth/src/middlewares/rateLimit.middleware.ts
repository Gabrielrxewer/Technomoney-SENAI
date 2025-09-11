import rateLimit from "express-rate-limit";
import { logger } from "../utils/log/logger";
import { makeRateLimitStore } from "./rateLimit.store";

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res: any) => {
    const resetTime = (req as any).rateLimit.resetTime as Date | undefined;
    const now = new Date();
    const secs = resetTime
      ? Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
      : 300;
    logger.warn({ path: req.path, secs }, "rate_limit_ip.blocked");
    res
      .status(429)
      .json({
        message: `Muitas tentativas do seu IP. Tente novamente em ${secs} segundos.`,
        retryAfter: secs,
      });
  },
  store: makeRateLimitStore("rl:ip:"),
});
