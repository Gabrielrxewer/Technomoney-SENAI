import Redis from "ioredis"

const url = process.env.REDIS_URL || ""
const isProd = process.env.NODE_ENV === "production"
if (isProd && !url) {
  throw new Error("REDIS_URL ausente em produção")
}

export const redis = url ? new Redis(url) : (null as unknown as Redis)
