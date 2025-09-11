import { logger } from "../utils/log/logger";
import type { Store } from "express-rate-limit";
import { createClient } from "redis";
import RedisStore from "rate-limit-redis";

let client: ReturnType<typeof createClient> | undefined;

const ensureClient = async () => {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production")
      throw new Error("REDIS_URL ausente em produção");
    logger.debug({}, "ratelimit.redis.disabled");
    return undefined;
  }

  const connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 15000);
  const base = Number(process.env.REDIS_RECONNECT_BASE_MS || 500);
  const max = Number(process.env.REDIS_RECONNECT_MAX_MS || 2000);
  const grace = Number(process.env.REDIS_INIT_GRACE_MS || 5000);
  const startedAt = Date.now();
  let ready = false;

  client = createClient({
    url,
    socket: {
      connectTimeout,
      keepAlive: true,
      keepAliveInitialDelay: connectTimeout,
      noDelay: true,
      reconnectStrategy: (retries) => Math.min(base * 2 ** retries, max),
    },
  });

  client.on("ready", () => {
    ready = true;
    logger.debug({}, "ratelimit.redis.connected");
  });

  client.on("error", (err) => {
    const withinGrace = Date.now() - startedAt < grace;
    const level = ready || !withinGrace ? "warn" : "debug";
    (logger as any)[level]({ err }, "ratelimit.redis.error");
  });

  await client.connect();
  return client;
};

export const makeRateLimitStore = (prefix: string): Store | undefined => {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production")
      throw new Error("REDIS_URL ausente em produção");
    return undefined;
  }
  return new (RedisStore as any)({
    prefix,
    sendCommand: async (...args: string[]) => {
      const c = await ensureClient();
      if (!c) return "OK";
      return (c as any).sendCommand(args);
    },
  }) as Store;
};
