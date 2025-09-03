import RedisStore from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let store: InstanceType<typeof RedisStore> | undefined;

const ensureClient = async () => {
  if (client && client.isOpen) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  client = createClient({ url });
  client.on("error", () => {});
  if (!client.isOpen) await client.connect().catch(() => {});
  return client;
};

export const getRateLimitStore = () => {
  if (store) return store;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return undefined;
  store = new RedisStore({
    sendCommand: async (...args: string[]) => {
      const c = await ensureClient();
      if (!c) return "OK";
      return c.sendCommand(args as any);
    },
  }) as any;
  return store;
};
