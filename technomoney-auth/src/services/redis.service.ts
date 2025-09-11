import { createClient, RedisClientType } from "redis";
import { logger } from "../utils/log/logger";

let client: RedisClientType | undefined;

export const getRedis = async () => {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim();
  const isProd = process.env.NODE_ENV === "production";
  if (!url) {
    if (isProd) throw new Error("REDIS_URL ausente em produção");
    return undefined;
  }
  client = createClient({ url });
  client.on("error", (err) => logger.error({ err }, "redis.error"));
  await client.connect();
  return client;
};
