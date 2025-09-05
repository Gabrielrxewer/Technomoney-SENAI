export function ensureRedis() {
  const isProd = process.env.NODE_ENV === "production"
  if (isProd && !process.env.REDIS_URL) {
    throw new Error("REDIS_URL ausente em produção")
  }
}
