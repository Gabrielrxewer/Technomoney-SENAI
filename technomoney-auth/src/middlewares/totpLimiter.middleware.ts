import { RequestHandler, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

let redisLimiter: any = null;
let redisClient: any = null;

const points = Number(process.env.TOTP_LIMIT_POINTS || 5);
const duration = Number(process.env.TOTP_LIMIT_WINDOW_SEC || 300);

const memoryLimiter = new RateLimiterMemory({
  keyPrefix: "totp_verify",
  points,
  duration,
});

const getLimiter = () => {
  if (redisLimiter) return redisLimiter;
  const url = process.env.REDIS_URL;
  if (!url) return memoryLimiter;
  try {
    const IORedis = require("ioredis");
    const { RateLimiterRedis } = require("rate-limiter-flexible");
    redisClient = new IORedis(url);
    redisLimiter = new RateLimiterRedis({
      keyPrefix: "totp_verify",
      storeClient: redisClient,
      points,
      duration,
      insuranceLimiter: memoryLimiter,
    });
    return redisLimiter;
  } catch {
    return memoryLimiter;
  }
};

const computeKey = (req: any) => {
  const uid = req.user?.id || req.session?.userId || req.body?.email || "";
  return String(uid || req.ip).toLowerCase();
};

export const totpVerifyLimiter: RequestHandler = async (req, res, next) => {
  const limiter = getLimiter();
  const key = computeKey(req);
  try {
    await limiter.consume(key, 1);
    res.locals.totpLimiterKey = key;
    next();
  } catch {
    res
      .status(429)
      .json({ message: "Muitas tentativas. Tente novamente mais tarde." });
  }
};

export const resetTotpLimiter = async (res: Response) => {
  const limiter = getLimiter();
  const key = res.locals.totpLimiterKey;
  if (!key) return;
  try {
    if (typeof limiter.delete === "function") {
      await limiter.delete(key);
    } else if (typeof limiter.reward === "function") {
      await limiter.reward(key, points);
    }
  } catch {}
};
