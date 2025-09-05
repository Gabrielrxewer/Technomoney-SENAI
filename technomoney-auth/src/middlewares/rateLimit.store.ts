import { logger } from "../utils/logger";
import type { Store } from "express-rate-limit";
import { createClient } from "redis";
import RedisStore from "rate-limit-redis";

let store: Store | undefined;
let client: ReturnType<typeof createClient> | undefined;

const ensureClient = async () => {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL ausente em produção");
  } else {
    logger.debug({}, "ratelimit.redis.disabled");
    return undefined;
  }
}
  client = createClient({ url });
  client.on("error", (err) => logger.warn({ err }, "ratelimit.redis.error"));
  await client.connect();
  logger.debug({}, "ratelimit.redis.connected");
  return client;
};

export const getRateLimitStore = () => {
  if (store) return store;
  const url = process.env.REDIS_URL?.trim();
  if (!url) { if (process.env.NODE_ENV === "production") { throw new Error("REDIS_URL ausente em produção"); } return undefined; }
  store = new RedisStore({
    sendCommand: async (...args: string[]) => {
      const c = await ensureClient();
      if (!c) return "OK";
      return c.sendCommand(args as any);
    },
  }) as any;
  logger.debug({}, "ratelimit.store.ready");
  return store;
};
