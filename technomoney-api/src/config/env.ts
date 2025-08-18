import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DB_HOST: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  DB_DRIVER: z.string(),
  JWT_SECRET: z.string(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "\n❌  Invalid environment variables:\n",
    parsed.error.format()
  );
  process.exit(1);
}

export const env = parsed.data;
