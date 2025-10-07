import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DB_HOST: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  DB_DRIVER: z.string(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  AUTH_JWKS_URL: z.string().url(),
  AUTH_ISSUER: z.string(),
  AUTH_AUDIENCE: z.string(),
  AUTH_CLOCK_TOLERANCE: z.string().optional(),
  AUTH_ALLOWED_ALGS: z.string().optional(),
  AUTH_STATIC_JWKS: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
