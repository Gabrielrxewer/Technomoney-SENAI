import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4010),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  AUTH_INTROSPECTION_URL: z
    .string()
    .min(1, "AUTH_INTROSPECTION_URL é obrigatório para validar tokens"),
  AUTH_INTROSPECTION_CLIENT_ID: z.string().optional(),
  AUTH_INTROSPECTION_CLIENT_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  AGENT_MODEL_NAME: z.string().default("fundamental-trend-v1"),
  AGENT_BUY_THRESHOLD: z.coerce.number().min(0).max(100).default(60),
  AGENT_HOLD_THRESHOLD: z.coerce.number().min(0).max(100).default(45),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Falha ao carregar variáveis de ambiente do serviço de IA");
  console.error(parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
