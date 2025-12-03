import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().optional(),
  DB_HOST: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string().optional().default(""),
  DB_DATABASE: z.string(),
  DB_DRIVER: z.string().default("postgres"),
  DB_PORT: z.string().optional(),
  AUTH_INTROSPECTION_URL: z.string().url(),
  AUTH_INTROSPECTION_CLIENT_ID: z.string(),
  AUTH_INTROSPECTION_CLIENT_SECRET: z.string(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export const env = EnvSchema.parse(process.env);
