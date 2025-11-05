import "dotenv/config";
import { Options } from "sequelize";

type DbEnv = "production" | "development" | "test";
type DbOptions = Options & {
  use_env_variable?: string;
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
};

const S = (v: unknown, fallback = ""): string =>
  v === undefined || v === null ? fallback : String(v);

const N = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const base: DbOptions = {
  username: S(process.env.DB_USERNAME, "postgres"),
  password: S(process.env.DB_PASSWORD, ""),
  database: S(process.env.DB_DATABASE, "technomoney_auth"),
  host: S(process.env.DB_HOST, "127.0.0.1"),
  port: N(process.env.DB_PORT, 5432),
  dialect: (process.env.DB_DRIVER || "postgres") as any,
  logging: false,
  dialectOptions: { ssl: false },
};

const config: Record<DbEnv, DbOptions> = {
  production: { ...base },
  development: { ...base },
  test: { ...base },
};

export = config;
